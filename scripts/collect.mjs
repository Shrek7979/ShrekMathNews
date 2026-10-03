// 수학 뉴스 수집기: scripts/sources.mjs 의 피드를 읽어 data/feed.json 을 갱신합니다.
// 실행: npm run collect  (GitHub Actions 가 하루 2번 자동 실행)
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import * as cheerio from 'cheerio'
import { pathToFileURL } from 'node:url'
import { ensureThumbs } from './thumbs.mjs'
import { translateItems } from './translate.mjs'
import { youtubeFeed, SOURCES, KO_REQUIRE, KO_EXCLUDE, EN_REQUIRE, BLOCKED_SOURCES, KO_CATEGORIES } from './sources.mjs'

// npm 스크립트와 Next.js 서버 모두 프로젝트 루트에서 실행됨
export const FEED_PATH = resolve(process.cwd(), 'data/feed.json')
const KEEP_DAYS = 7
const MAX_ITEMS = 150
const TITLE_LENGTH = 90
const SUMMARY_LENGTH = 56 // 제목 밑 설명은 한 줄(한 문장)만
const DAY = 24 * 60 * 60 * 1000
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()
const stripHtml = (html) => clean(cheerio.load(`<div>${html || ''}</div>`)('div').text())
// 요약 앞의 "[매체명]" / "(지역=매체) ○○○ 기자 =" 같은 바이라인 제거
const stripByline = (s) =>
  s.replace(/^\[[^\]]{1,30}\]\s*/, '').replace(/^\([^)]{1,40}\)\s*(?:[^=]{0,25}=\s*)?/, '')
// 첫 문장만 남기고, 그래도 길면 단어 경계에서 자름 → 카드의 '한 줄 설명'
export const oneLine = (s, n = SUMMARY_LENGTH) => {
  const text = clean(s)
  const first = text.match(/^.*?(?:[.!?]|다\.|요\.)(?=\s|$)/)?.[0] || text
  return truncate(first.replace(/[.]$/, ''), n)
}
const truncate = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s)
const titleKey = (title) => title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const makeId = (title) => createHash('sha1').update(titleKey(title)).digest('hex').slice(0, 12)

// 같은 사건을 여러 언론사가 다룬 기사를 걸러내기 위한 제목 유사도 (글자 2-gram 자카드)
const bigrams = (title) => {
  const key = titleKey(title)
  const set = new Set()
  for (let i = 0; i < key.length - 1; i++) set.add(key.slice(i, i + 2))
  return set
}
const similarity = (a, b) => {
  let common = 0
  for (const gram of a) if (b.has(gram)) common++
  return common / (a.size + b.size - common || 1)
}
const SIMILAR_THRESHOLD = 0.33

function categorize(item) {
  if (item.category) return item.category
  if (item.kind === 'video') return '영상'
  if (item.lang !== 'ko') return '해외'
  const text = `${item.title} ${item.summary}`
  const hit = KO_CATEGORIES.find(([, pattern]) => pattern.test(text))
  return hit ? hit[0] : '교육'
}

function parseEntry($, el, source) {
  const $el = $(el)
  const text = (selector) => clean($el.children(selector).first().text())

  let title = text('title')
  let link = $el.children('link').first().attr('href') || text('link')
  let sourceName = source.name
  let summary = stripHtml(text('description') || text('summary') || text('content'))
  let image
  let views

  if (source.type === 'bing') {
    sourceName = text('News\\:Source').replace(/ on MSN$/, '')
    image = text('News\\:Image') || undefined
    try {
      link = new URL(link).searchParams.get('url') || link
    } catch {}
  } else if (source.type === 'youtube') {
    const group = $el.children('media\\:group')
    image = group.children('media\\:thumbnail').attr('url')
    summary = clean(group.children('media\\:description').text().split('\n')[0])
    title = title.replace(new RegExp(` - ${source.name}$`), '')
    views = Number(group.find('media\\:statistics').attr('views') || 0) || undefined
  } else if (/reddit\.com/.test(source.url)) {
    // 레딧 Atom: 본문 끝의 "submitted by /u/…" 꼬리표 제거, 링크 글이면 섬네일 사용
    summary = summary.replace(/\s*submitted by.*$/i, '').replace(/\[link\]|\[comments\]/g, '').trim()
    image = $el.children('media\\:thumbnail').attr('url') || undefined
  } else {
    summary = summary.replace(/\s*The post .* first appeared on .*$/, '')
    // 피드가 주는 대표 이미지 (90px 짜리 아이콘은 건너뛰고 기사 og:image 를 쓰게 함)
    const media = $el.children('media\\:content, media\\:thumbnail, enclosure').first()
    const width = Number(media.attr('width') || 0)
    if (media.attr('url') && (!width || width >= 200)) image = media.attr('url')
  }

  const published = new Date(text('pubDate') || text('published') || text('updated'))
  const categories = $el.children('category').map((_, c) => clean($(c).text())).get()

  return {
    id: makeId(title),
    kind: source.type === 'youtube' ? 'video' : 'news',
    lang: source.lang,
    title: truncate(title, TITLE_LENGTH),
    summary: oneLine(stripByline(summary)),
    link,
    source: sourceName || new URL(link).hostname,
    image,
    views,
    category: source.category,
    publishedAt: isNaN(published) ? null : published.toISOString(),
    feedCategories: categories,
  }
}

// 여러 채널의 최근 영상을 모아 조회수 순으로 상위만 고름
async function collectYoutubeTop(source, now) {
  const feeds = await Promise.allSettled(
    source.channels.map(([name, channelId, lang]) =>
      collectSource({ type: 'youtube', name, lang, url: youtubeFeed(channelId), limit: 50, maxAgeDays: source.maxAgeDays }, now)
    )
  )
  return feeds
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((item) => item.views >= (source.minViews || 1))
    .sort((a, b) => b.views - a.views)
    .slice(0, source.limit)
    .map((item) => ({ ...item, category: source.category }))
}

async function collectSource(source, now) {
  if (source.type === 'youtube-top') return collectYoutubeTop(source, now)
  const res = await fetch(source.url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const $ = cheerio.load(await res.text(), { xmlMode: true })

  return $('item, entry')
    .map((_, el) => parseEntry($, el, source))
    .get()
    .filter((item) => item.title && /^https?:/.test(item.link || '') && item.publishedAt)
    .filter((item) => now - new Date(item.publishedAt) <= source.maxAgeDays * DAY)
    .filter((item) => !source.requireCategory || item.feedCategories.includes(source.requireCategory))
    .filter((item) => !BLOCKED_SOURCES.includes(item.source))
    .filter((item) => {
      if (source.type === 'youtube' || source.requireCategory) return true
      if (source.lang !== 'ko') return EN_REQUIRE.test(`${item.title} ${item.summary}`)
      return KO_REQUIRE.test(item.title) && !KO_EXCLUDE.test(item.title)
    })
    .slice(0, source.limit)
    .map(({ feedCategories, ...item }) => ({ ...item, category: categorize(item) }))
}

export async function collect() {
  const now = new Date()
  let previous = []
  try {
    previous = JSON.parse(await readFile(FEED_PATH, 'utf8')).items || []
  } catch {}

  const delay = (ms) => new Promise((r) => setTimeout(r, ms))
  const results = await Promise.allSettled(
    SOURCES.map((s) => delay(s.delayMs || 0).then(() => collectSource(s, now)))
  )
  const fresh = []
  let failed = 0
  results.forEach((result, i) => {
    const label = SOURCES[i].name || (SOURCES[i].url ? decodeURIComponent(SOURCES[i].url).slice(0, 80) : `유튜브 인기 (${SOURCES[i].channels.length}개 채널)`)
    if (result.status === 'fulfilled') {
      console.log(`✓ ${String(result.value.length).padStart(2)}건  ${label}`)
      fresh.push(...result.value)
    } else {
      failed++
      console.warn(`✗ 실패  ${label}: ${result.reason.message}`)
    }
  })

  if (failed === SOURCES.length) {
    throw new Error('모든 소스 수집에 실패했습니다. 기존 feed.json 을 유지합니다.')
  }

  // 이전 수집분이 먼저 오도록 합쳐서, 이미 있던 기사는 처음 수집된 시각(collectedAt)을 유지
  const kept = []
  const items = [...previous, ...fresh.map((item) => ({ ...item, collectedAt: now.toISOString() }))]
    .filter((item) => now - new Date(item.collectedAt) <= KEEP_DAYS * DAY)
    .filter((item) => {
      const grams = bigrams(item.title)
      if (kept.some((other) => similarity(grams, other) >= SIMILAR_THRESHOLD)) return false
      kept.push(grams)
      return true
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, MAX_ITEMS)

  const added = items.filter((item) => item.collectedAt === now.toISOString()).length
  for (const item of items) {
    item.summary = oneLine(item.summary)
    if (item.summaryKo) item.summaryKo = oneLine(item.summaryKo)
  }

  console.log('\n번역 중…')
  try {
    const { translated, provider } = await translateItems(items)
    if (provider) console.log(`✓ 해외 기사 ${translated}건 번역 (${provider})`)
  } catch (error) {
    console.warn(`✗ 번역 실패: ${error.message}`)
  }

  console.log('섬네일 확보 중…')
  const thumbs = await ensureThumbs(items)
  console.log(`✓ 섬네일 ${thumbs.added}건 새로 저장, 없는 카드 ${items.filter((i) => !i.thumb).length}건`)

  await mkdir(dirname(FEED_PATH), { recursive: true })
  await writeFile(FEED_PATH, JSON.stringify({ updatedAt: now.toISOString(), items }, null, 2) + '\n')
  console.log(`\n새 카드 ${added}건 추가, 총 ${items.length}건 → data/feed.json`)
  return { added, total: items.length }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  collect().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
