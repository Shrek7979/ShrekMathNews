// 수학 뉴스 수집기: scripts/sources.mjs 의 피드를 읽어 data/feed.json 을 갱신합니다.
// 실행: npm run collect  (GitHub Actions 가 하루 2번 자동 실행)
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import * as cheerio from 'cheerio'
import { pathToFileURL } from 'node:url'
import { ensureThumbs } from './thumbs.mjs'
import { translateDetails, translateItems } from './translate.mjs'
import { findDeadLinks } from './linkcheck.mjs'
import { PROBLEM_CHANNELS, PROBLEM_WORDS, youtubeFeed, SOURCES, KO_REQUIRE, KO_EXCLUDE, EN_REQUIRE, BLOCKED_SOURCES, KO_CATEGORIES } from './sources.mjs'

// npm 스크립트와 Next.js 서버 모두 프로젝트 루트에서 실행됨
export const FEED_PATH = resolve(process.cwd(), 'data/feed.json')
const KEEP_DAYS = 7
const MAX_ITEMS = 150
const TITLE_LENGTH = 90
const SUMMARY_LENGTH = 56 // 제목 밑 설명은 한 줄(한 문장)만
// 개인 소식(부고, 임명·위촉, 취임·퇴임, 인사 발령 등)은 싣지 않음. '선임연구원' 같은 직급은 남김
export const PERSONAL_NEWS = /부고|별세|타계|영면|빈소|발인|장례|추도식|추모식|조문|부음|訃|임명|위촉|임용장|수여식|취임|이임식|퇴임|승진|인사\s?발령|인사이동|전보\s?발령|\[인사\]|\[동정\]|내정|화촉|결혼식|선임(?!연구|기자|병|원)|obituar|in memoriam|passed away|\b(dies|died|dead) at \d|funeral|\bappointed\b|\bnamed (new |as )?(president|director|dean|chair|head|editor|ceo)\b|\bretire(s|ment)\b|steps down/i
// 저널 피드의 기사 아닌 글 (표지 소개, 목차, 정정 공고 등)
const JOURNAL_JUNK = /^(inside |outside )?(front|back) cover|frontispiece|cover picture|table of contents|issue information|masthead|^(correction|erratum|corrigendum|publisher correction|author correction)\b/i
const DETAIL_LENGTH = 140 // 카드에 보여 주는 긴 설명 (2~3줄). 통합 사이트(Shrek Edu Insight)도 씀
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
const detailText = (s) => truncate(clean(s), DETAIL_LENGTH)
// 유튜브 설명란 첫 줄은 감사 인사·링크·구독 안내인 경우가 많아 카드 설명으로 쓰지 않음
const isJunkVideoText = (s) => !s || s.length < 25 || /https?:|thanks|감사|patreon|subscribe|구독|podcast|팟캐스트|전체 동영상|full video/i.test(s)
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
    if (isJunkVideoText(summary)) summary = ''
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
    // 설명 칸이 저널 안내 문구뿐이면(Angewandte 'EarlyView.' 등) 본문 칸(content:encoded)의 초록과 그림을 씀
    const encoded = $el.children('content\\:encoded').first().text()
    if (encoded && (summary.length < 60 || /EarlyView|Published online/i.test(summary))) {
      // Nature 계열은 이 칸에 '발행일; doi + 제목'만 있으므로 그 부분을 떼고, 남는 게 제목뿐이면 쓰지 않음
      const body = stripHtml(encoded.replace(/<\/p>/g, '</p> ')).replace(/^[^;]{0,80}Published online:[^;]*;\s*doi:\S+\s*/i, '').trim()
      if (body.length >= 30 && body !== clean(title)) summary = body
      image = image || encoded.match(/<img[^>]+src="([^"]+)"/)?.[1]
    }
  }

  // Nature 등 RSS 1.0(RDF) 피드는 날짜를 dc:date 로 적음
  const published = new Date(text('pubDate') || text('published') || text('updated') || text('dc\\:date'))
  const categories = $el.children('category').map((_, c) => clean($(c).text())).get()

  return {
    id: makeId(title),
    kind: source.type === 'youtube' ? 'video' : 'news',
    lang: source.lang,
    title: truncate(title, TITLE_LENGTH),
    summary: oneLine(stripByline(summary)),
    detail: detailText(stripByline(summary)),
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
    .filter((item) => !/[぀-ヿऀ-ॿঀ-৿؀-ۿ]/.test(item.title)) // 번역이 안 되는 언어 제외
    .sort((a, b) => b.views - a.views)
    .filter((item, _, list) => {
      // 한 채널이 인기 카드를 독차지하지 않게 채널당 maxPerChannel 건까지
      const sameChannelBefore = list.slice(0, list.indexOf(item)).filter((other) => other.source === item.source).length
      return sameChannelBefore < (source.maxPerChannel || Infinity)
    })
    .slice(0, source.limit)
    .map((item) => ({
      ...item,
      // 문제 풀이·증명 채널이거나 제목이 그런 내용이면 '문제·증명' 칩으로 (인기 칩에는 조회수 순으로 함께 나옴)
      category: PROBLEM_CHANNELS.test(item.source) || PROBLEM_WORDS.test(item.title) ? '문제·증명' : source.category,
    }))
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
    .filter((item) => !source.requireTitle || source.requireTitle.test(item.title))
    .filter((item) => !source.requireImage || item.image)
    .filter((item) => {
      if (JOURNAL_JUNK.test(item.title)) return false
      // 여러 과목이 섞인 피드(Science 뉴스 등)는 제목에 과목 낱말이 있을 때만
      if (source.require) return source.require.test(item.title)
      if (source.type === 'youtube' || source.requireCategory || source.trusted) return true
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

  // 유튜브 인기 영상은 '지금의 순위'라서 쌓아 두지 않고 매번 새로 고름 (이번에 뽑히지 않은 예전 영상은 내림)
  const topOk = results.some((result, i) => SOURCES[i].type === 'youtube-top' && result.status === 'fulfilled')
  const freshIds = new Set(fresh.map((item) => item.id))
  const carried = previous.filter((old) => !(topOk && old.kind === 'video' && old.views && !freshIds.has(old.id)))
  // 계속 남는 카드는 조회수와 칩(카테고리)을 이번 값으로 갱신
  const freshById = new Map(fresh.map((item) => [item.id, item]))
  for (const old of carried) {
    const latest = freshById.get(old.id)
    if (!latest) continue
    if (latest.views) old.views = latest.views
    if (latest.category) old.category = latest.category
  }

  // 통합 사이트용 긴 설명: 예전 카드도 원본 피드에 아직 있으면 채워 넣음
  const freshDetail = new Map(fresh.filter((item) => item.detail).map((item) => [item.id, item.detail]))
  for (const old of previous) if (!old.detail && freshDetail.has(old.id)) old.detail = freshDetail.get(old.id)

  // 이전 수집분이 먼저 오도록 합쳐서, 이미 있던 기사는 처음 수집된 시각(collectedAt)을 유지
  const kept = []
  let items = [...carried,...fresh.map((item) => ({ ...item, collectedAt: now.toISOString() }))]
    .filter((item) => now - new Date(item.collectedAt) <= KEEP_DAYS * DAY)
    .filter((item) => !/^Reddit/.test(item.source || '')) // 레딧은 더 이상 싣지 않음
    .filter((item) => !PERSONAL_NEWS.test(`${item.title} ${item.titleKo || ''}`)) // 부고·임명 같은 개인 소식 (예전 카드도 함께 정리)
    .filter((item) => !(item.kind === 'video' && !item.views)) // 영상은 조회수 상위로 뽑은 것만 싣기로 함
    .filter((item) => {
      const grams = bigrams(item.title)
      if (kept.some((other) => similarity(grams, other) >= SIMILAR_THRESHOLD)) return false
      kept.push(grams)
      return true
    })
    // 방금 새로 들어온 카드가 맨 앞, 같은 회차 안에서는 최신 발행순
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt) || new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, MAX_ITEMS + 20) // 링크가 죽은 카드를 빼고도 MAX_ITEMS 를 채울 여유

  // 원문이 사라진(404 등) 카드는 뺌 — 예전에 실린 기사가 나중에 지워지는 경우도 있어 매번 모두 확인
  console.log('\n링크 확인 중…')
  const dead = await findDeadLinks(items)
  for (const item of items) if (dead.has(item.id)) console.log(`✗ 링크 없음 (${dead.get(item.id)}) ${item.source}: ${item.link}`)
  items = items.filter((item) => !dead.has(item.id)).slice(0, MAX_ITEMS)
  console.log(`✓ 링크 ${dead.size}건 사라짐 → 제외`)

  const added = items.filter((item) => item.collectedAt === now.toISOString()).length

  console.log('\n번역 중…')
  try {
    const { translated, provider } = await translateItems(items)
    if (provider) console.log(`✓ 해외 기사 ${translated}건 번역 (${provider})`)
  } catch (error) {
    console.warn(`✗ 번역 실패: ${error.message}`)
  }

  // 번역문은 원문보다 길어질 수 있어 번역 뒤에 한 줄로 다시 맞춤
  for (const item of items) {
    if (item.kind === 'video' && isJunkVideoText(item.summary)) item.summary = item.summaryKo = item.detail = item.detailKo = ''
    item.summary = oneLine(item.summary)
    if (item.summaryKo) item.summaryKo = oneLine(item.summaryKo)
    // 긴 설명이 한 줄 설명과 거의 같으면 둘 필요 없음
    if (item.detail && item.detail.length < (item.summary || '').length + 12) delete item.detail
    if (!item.detail) delete item.detailKo
    else if (item.detailKo) item.detailKo = detailText(item.detailKo)
  }

  try {
    const details = await translateDetails(items)
    if (details) console.log(`✓ 긴 설명 ${details}건 번역`)
  } catch (error) {
    console.warn(`✗ 긴 설명 번역 실패: ${error.message}`)
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
  let done = false
  // 어딘가에서 응답이 영영 오지 않으면 node 가 할 일 없이 '성공(0)'으로 끝나 버림 → 실패로 알려 기존 피드를 쓰지 않게 함
  process.on('beforeExit', () => {
    if (done) return
    console.error('수집이 끝나지 않은 채 멈췄습니다 (feed.json 저장 안 됨).')
    process.exit(1)
  })
  collect().then(
    () => (done = true),
    (error) => {
      console.error(error.message)
      process.exit(1)
    }
  )
}
