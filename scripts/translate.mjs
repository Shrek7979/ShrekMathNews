// 해외 기사 번역: ANTHROPIC_API_KEY 가 있으면 Claude 로 자연스러운 한글 요약·번역,
// 없으면 MyMemory 무료 번역 API(키 불필요, 하루 약 5,000자) 로 제목·요약을 직역합니다.
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

const MYMEMORY = 'https://api.mymemory.translated.net/get'
const CLAUDE_MODEL = 'claude-opus-5-5'

const hasClaudeKey = () => Boolean(process.env.ANTHROPIC_API_KEY)

async function translateWithMyMemory(text) {
  if (!text) return ''
  const url = `${MYMEMORY}?q=${encodeURIComponent(text.slice(0, 480))}&langpair=en|ko`
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`)
  const data = await res.json()
  if (data.responseStatus !== 200 || data.quotaFinished) {
    throw new Error(`MyMemory: ${data.responseDetails || '일일 한도 초과'}`)
  }
  const out = data.responseData.translatedText.trim()
  if (!out || /^MYMEMORY WARNING/i.test(out)) throw new Error('MyMemory 응답 없음')
  return out
}

const Translation = z.object({
  translations: z.array(
    z.object({
      id: z.string(),
      titleKo: z.string(),
      summaryKo: z.string(),
    })
  ),
})

async function translateWithClaude(items) {
  const client = new Anthropic()
  const response = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    system:
      '당신은 한국 중·고등학교 수학 교사들을 위한 뉴스 큐레이터입니다. ' +
      '영어 기사 제목과 요약을 자연스러운 한국어로 옮기되, 제목은 40자 이내로 간결하게, ' +
      '요약은 한 문장(50자 이내)으로 핵심만 담아 주세요. 수학 용어는 한국 교육과정 표기를 따릅니다.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify(items.map(({ id, title, summary }) => ({ id, title, summary }))),
      },
    ],
    output_config: { format: zodOutputFormat(Translation) },
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error('Claude 번역 결과를 읽지 못했습니다')
  }
  return new Map(response.parsed_output.translations.map((t) => [t.id, t]))
}

// lang === 'en' 이고 아직 titleKo 가 없는 항목만 번역해서 titleKo / summaryKo 를 채움
export async function translateItems(items) {
  const targets = items.filter((item) => item.lang === 'en' && !item.titleKo)
  if (targets.length === 0) return { translated: 0, provider: null }

  if (hasClaudeKey()) {
    const result = await translateWithClaude(targets)
    for (const item of targets) {
      const t = result.get(item.id)
      if (t) Object.assign(item, { titleKo: t.titleKo, summaryKo: t.summaryKo, translator: 'claude' })
    }
    return { translated: result.size, provider: 'claude' }
  }

  let translated = 0
  for (const item of targets) {
    try {
      item.titleKo = await translateWithMyMemory(item.title)
      item.summaryKo = item.summary ? await translateWithMyMemory(item.summary) : ''
      item.translator = 'mymemory'
      translated++
    } catch (error) {
      console.warn(`  번역 보류: ${item.title.slice(0, 40)}… (${error.message})`)
      break // 한도 초과 등은 다음 수집 때 다시 시도
    }
  }
  return { translated, provider: 'mymemory' }
}
