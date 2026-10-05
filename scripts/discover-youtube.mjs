// 유튜브에서 수학 채널을 찾아 구독자 1만 명 이상인 곳만 data/youtube-channels.json 에 저장합니다.
// 수집기(collect.mjs)는 이 목록의 채널들에서 최근 영상 중 조회수 상위를 '인기' 카드로 싣습니다.
// 실행: node scripts/discover-youtube.mjs   (배포 워크플로가 7일마다 자동 실행)
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const OUT = resolve(process.cwd(), 'data/youtube-channels.json')
export const MIN_SUBSCRIBERS = 10_000
const MAX_AGE_DAYS = 60 // 최근 60일 안에 영상을 올린 채널만
const DAY = 24 * 60 * 60 * 1000
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const QUERIES = {
  ko: [
    '수학', '수학 강의', '수학 개념', '수학 선생님', '수학 교사', '수능 수학', '고등 수학', '중학 수학',
    '초등 수학', '수학 퍼즐', '재미있는 수학', '수학 이야기', '미적분', '확률과 통계', '수학 올림피아드', '수학 교육',
    '수학 증명', '수학 문제 풀이', '신기한 수학 문제', '수학 경시대회',
  ],
  en: [
    'math', 'mathematics', 'math explained', 'math puzzles', 'math education', 'math teacher', 'calculus',
    'linear algebra', 'number theory', 'math olympiad', 'recreational mathematics', 'math visualization',
    'math proof', 'visual proof', 'math problem solving', 'olympiad problem', 'math competition', 'geometry puzzle',
  ],
}

// 채널 이름·소개에 이런 말이 있어야 수학 채널로 봄 (검색어 때문에 섞여 들어온 다른 채널 제외)
const MATH = /수학|미적분|기하|확률|통계|산수|연산|정석|올림피아드|증명|math|calculus|algebra|geometr|number theory|olympiad|puzzle|proof/i
// 수학과 무관하거나 교사용으로 부적절한 채널 제외
const EXCLUDE = /asmr|게임|game|먹방|vlog|브이로그|music|음악|bitcoin|코인|주식|stock/i
// 한국어·영어가 아닌 글자(일본어 가나, 힌디어 등)가 이름·소개에 있으면 제외 — 번역이 엉망이 되기 때문
const OTHER_SCRIPT = /[぀-ヿऀ-ॿঀ-৿؀-ۿ฀-๿]/
// 다른 나라 시험 대비용 채널 (영상 대부분이 현지어)
const BLOCKED = /adda|vedantu|saraswati|ravinder|isip|gelo|bangladesh|leonalyn|tricky maths/i

const text = (node) => node?.simpleText || (node?.runs || []).map((run) => run.text).join('') || ''

// "구독자 3.41만명", "구독자 1.51천명", "1.2M subscribers", "345K subscribers" → 숫자
export function parseSubscribers(label) {
  const ko = label.match(/구독자\s*([\d.,]+)\s*(억|만|천)?\s*명/)
  if (ko) return Number(ko[1].replace(/,/g, '')) * ({ 억: 1e8, 만: 1e4, 천: 1e3 }[ko[2]] || 1)
  const en = label.match(/([\d.,]+)\s*([KMB])?\s*subscribers?/i)
  if (en) return Number(en[1].replace(/,/g, '')) * ({ K: 1e3, M: 1e6, B: 1e9 }[(en[2] || '').toUpperCase()] || 1)
  return 0
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 짧은 시간에 검색을 많이 하면 연결이 끊기므로, 간격을 두고 실패하면 몇 번 다시 시도
async function search(query, lang) {
  for (let attempt = 1; ; attempt++) {
    try {
      await sleep(1200)
      return await searchOnce(query, lang)
    } catch (error) {
      if (attempt >= 3) throw error
      await sleep(4000 * attempt)
    }
  }
}

async function searchOnce(query, lang) {
  // sp=EgIQAg%3D%3D : 검색 결과를 '채널'로 한정
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': lang === 'ko' ? 'ko-KR,ko;q=0.9' : 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const json = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)?.[1]
  if (!json) throw new Error('검색 결과를 읽지 못함')
  const found = []
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    if (node.channelRenderer) {
      const c = node.channelRenderer
      found.push({
        id: c.channelId,
        name: text(c.title),
        description: text(c.descriptionSnippet),
        subscribers: parseSubscribers(`${text(c.subscriberCountText)} ${text(c.videoCountText)}`),
      })
    }
    Object.values(node).forEach(walk)
  }
  walk(JSON.parse(json))
  return found
}

// 영상 제목이 수학 내용인지 (채널 이름에 math 가 들어가도 실제로는 예능인 채널이 있음)
export const MATH_TITLE = /math|calculus|algebra|geometr|equation|integral|derivative|proof|theorem|prime|fraction|puzzle|problem|solve|number|formula|수학|미적분|함수|방정식|증명|문제|기하|확률|통계|수능|모의|등급|개념|풀이|공식|수열|도형|약수|분수|넓이/i

// 채널 피드로 최근 활동과 내용 확인
export async function channelCheck(id) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) return null
  const xml = await res.text()
  const date = xml.match(/<entry>[\s\S]*?<published>([^<]+)<\/published>/)?.[1]
  const titles = [...xml.matchAll(/<entry>[\s\S]*?<title>([^<]*)<\/title>/g)].map((m) => m[1])
  return { last: date ? new Date(date) : null, mathTitles: titles.filter((t) => MATH_TITLE.test(t)).length }
}

export async function discover() {
  const channels = new Map()
  for (const [lang, queries] of Object.entries(QUERIES)) {
    for (const query of queries) {
      try {
        for (const c of await search(query, lang)) {
          const prev = channels.get(c.id)
          if (!prev || c.subscribers > prev.subscribers) channels.set(c.id, { ...c, query })
        }
      } catch (error) {
        console.warn(`✗ 검색 실패 "${query}": ${error.message}`)
      }
    }
  }

  const picked = []
  for (const c of channels.values()) {
    const about = `${c.name} ${c.description}`
    if (c.subscribers < MIN_SUBSCRIBERS || !MATH.test(about) || EXCLUDE.test(about) || OTHER_SCRIPT.test(about) || BLOCKED.test(c.name)) continue
    const check = await channelCheck(c.id)
    if (!check?.last || Date.now() - check.last > MAX_AGE_DAYS * DAY) continue
    if (check.mathTitles < 3) continue // 최근 영상 15개 중 수학 내용이 3개 미만이면 제외
    picked.push({
      id: c.id,
      name: c.name,
      lang: /[가-힣]/.test(about) ? 'ko' : 'en',
      subscribers: c.subscribers,
    })
  }
  picked.sort((a, b) => b.subscribers - a.subscribers)
  return { checked: channels.size, picked }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { checked, picked } = await discover()
  if (picked.length < 10) {
    console.error(`찾은 채널이 ${picked.length}개뿐이라 기존 목록을 유지합니다.`)
    process.exit(1)
  }
  // 직접 넣어 둔 채널(manual: true)은 유지
  let manual = []
  try {
    manual = (JSON.parse(await readFile(OUT, 'utf8')).channels || []).filter((c) => c.manual)
  } catch {}
  const ids = new Set(picked.map((c) => c.id))
  const all = [...picked, ...manual.filter((c) => !ids.has(c.id))]
  await writeFile(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), minSubscribers: MIN_SUBSCRIBERS, channels: all }, null, 2) + '\n')
  const ko = all.filter((c) => c.lang === 'ko').length
  console.log(`채널 ${checked}개 확인 → 구독자 ${MIN_SUBSCRIBERS.toLocaleString()}명 이상·최근 활동 수학 채널 ${all.length}개 (국내 ${ko}, 해외 ${all.length - ko})`)
}
