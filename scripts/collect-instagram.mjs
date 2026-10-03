// 인스타그램 수학 계정의 최근 게시물을 카드로 만듭니다 → data/instagram.json + public/social/ig/<코드>.jpg
// 로그인 없이 공개 프로필에 보이는 게시물만 읽습니다. GitHub 서버에서는 로그인 화면만 나오므로
// 집 PC 에서 실행한 뒤 커밋해야 합니다:  node scripts/collect-instagram.mjs   (또는 인스타-업데이트.bat)
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { evalOnPage } from './capture.mjs'
import { imageSize } from './thumbs.mjs'
import { oneLine } from './collect.mjs'
import { translateItems } from './translate.mjs'
import { INSTAGRAM_ACCOUNTS } from './sources.mjs'

const OUT_JSON = resolve(process.cwd(), 'data/instagram.json')
const IMG_DIR = resolve(process.cwd(), 'public/social/ig')
const PER_ACCOUNT = 3
const MAX_AGE_DAYS = 45
const DAY = 24 * 60 * 60 * 1000
// 게시물의 캡션·대표 이미지는 링크 미리보기용 정보(og 태그)에서 읽음
// 수학 내용이 아닌 홍보성 게시물(출석 이벤트 등)은 건너뜀
const SKIP = /출석|이벤트|경품|당첨|giveaway/i
const PREVIEW_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

// 프로필 화면의 게시물 격자에서 링크와 날짜를 읽음 (img alt: "Photo by EBSMATH on September 30, 2026. …")
const READ_GRID = `[...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')].map((a) => ({
  href: a.href,
  alt: a.querySelector('img')?.alt || '',
}))`

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const meta = (html, property) => {
  const match = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`))
  return match ? decode(match[1]) : ''
}

async function readPost(post, account, lang) {
  const code = post.href.match(/\/(?:p|reel)\/([^/]+)/)?.[1]
  const date = new Date(post.alt.match(/ on ([A-Z][a-z]+ \d{1,2}, \d{4})/)?.[1] || NaN)
  if (!code || isNaN(date) || Date.now() - date > MAX_AGE_DAYS * DAY) return null

  const res = await fetch(post.href, { headers: { 'User-Agent': PREVIEW_UA }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  // og:description: '105K likes, 290 comments - 3blue1brown on September 25, 2026: "캡션…".'
  const description = meta(html, 'og:description')
  const caption = (description.match(/: "([\s\S]*)"\.?\s*$/)?.[1] || '').replace(/\s+/g, ' ').trim()
  const likes = description.match(/^([\d.,]+[KM]?) likes/)?.[1]
  const image = meta(html, 'og:image')
  if (!image) return null

  if (SKIP.test(caption)) return null

  const img = await fetch(image, { signal: AbortSignal.timeout(20000) })
  if (!img.ok) throw new Error(`이미지 HTTP ${img.status}`)
  const bytes = Buffer.from(await img.arrayBuffer())
  if ((imageSize(bytes)?.width || 0) < 300) return null // 너무 작은 이미지는 카드로 쓰지 않음
  await writeFile(resolve(IMG_DIR, `${code}.jpg`), bytes)

  // 캡션에서 해시태그를 떼고, 첫 문장을 제목으로
  const text = caption.replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim()
  const firstSentence = text.match(/^.{8,80}?[.!?。](?=\s|$)/)?.[0] || text.slice(0, 70)
  const title = firstSentence || `${account} 인스타그램 게시물`
  return {
    id: `ig-${code}`,
    kind: post.href.includes('/reel/') ? 'video' : 'news',
    lang,
    title: title.length < text.length && !/[.!?。]$/.test(title) ? `${title}…` : title,
    summary: oneLine(text.slice(firstSentence.length).trim()), // 캡션이 한 문장뿐이면 설명은 비움
    link: post.href,
    source: `Instagram @${account}`,
    category: '인기',
    publishedAt: date.toISOString(),
    likes,
    thumb: `/social/ig/${code}.jpg`,
  }
}

await mkdir(IMG_DIR, { recursive: true })
const items = []
for (const [account, lang] of INSTAGRAM_ACCOUNTS) {
  try {
    const grid = await evalOnPage(`https://www.instagram.com/${account}/`, READ_GRID)
    if (!grid?.length) throw new Error('게시물을 읽지 못함 (로그인 화면일 수 있음)')
    const posts = []
    for (const post of grid) {
      if (posts.length >= PER_ACCOUNT) break
      try {
        const item = await readPost(post, account, lang)
        if (item) posts.push(item)
      } catch (error) {
        console.warn(`  건너뜀 ${post.href}: ${error.message}`)
      }
    }
    // 고정 게시물이 앞에 올 수 있어 날짜순으로 다시 정렬
    posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    items.push(...posts)
    console.log(`✓ ${String(posts.length).padStart(2)}건  @${account}`)
  } catch (error) {
    console.warn(`✗ 실패  @${account}: ${error.message}`)
  }
}

if (items.length === 0) {
  console.error('가져온 게시물이 없어 기존 data/instagram.json 을 그대로 둡니다.')
  process.exit(1)
}

// 이번에 못 읽은 계정이 있어도 카드가 사라지지 않게, 아직 기간이 남은 이전 게시물은 유지.
// collectedAt(처음 가져온 시각)은 한 번 정해지면 그대로 둠 → 새로 올라온 게시물만 피드 맨 앞에 나옴
const now = new Date().toISOString()
try {
  const previous = JSON.parse(await readFile(OUT_JSON, 'utf8')).items || []
  const firstSeen = new Map(previous.map((old) => [old.id, old.collectedAt || old.publishedAt]))
  for (const item of items) item.collectedAt = firstSeen.get(item.id) || now
  const ids = new Set(items.map((item) => item.id))
  for (const old of previous) {
    const fresh = Date.now() - new Date(old.publishedAt) <= MAX_AGE_DAYS * DAY
    if (!ids.has(old.id) && fresh && !SKIP.test(`${old.title} ${old.summary}`)) items.push(old)
  }
} catch {
  for (const item of items) item.collectedAt = now
}

try {
  const { translated } = await translateItems(items)
  if (translated) console.log(`✓ 영어 게시물 ${translated}건 번역`)
} catch (error) {
  console.warn(`✗ 번역 실패: ${error.message}`)
}

items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
await writeFile(OUT_JSON, JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2) + '\n')

// 더 이상 쓰지 않는 이미지 정리
const keep = new Set(items.map((item) => item.thumb.split('/').pop()))
for (const file of await readdir(IMG_DIR)) if (!keep.has(file)) await unlink(resolve(IMG_DIR, file))

console.log(`\n인스타그램 게시물 ${items.length}건 → data/instagram.json`)
