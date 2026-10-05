// 인스타그램 수학 계정의 최근 게시물 중 좋아요가 많은 것을 카드로 만듭니다 → data/instagram.json + public/social/ig/<코드>.jpg
// 로그인 없이 공개 프로필에 보이는 게시물만 읽습니다. GitHub 서버에서는 로그인 화면만 나오므로
// 집 PC 에서 실행한 뒤 커밋해야 합니다:  node scripts/collect-instagram.mjs   (또는 인스타-업데이트.bat)
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { evalOnPage } from './capture.mjs'
import { imageSize } from './thumbs.mjs'
import { oneLine } from './collect.mjs'
import { translateItems } from './translate.mjs'
import { EN_REQUIRE, INSTAGRAM_ACCOUNTS, MIN_FOLLOWERS, PROBLEM_WORDS } from './sources.mjs'

const OUT_JSON = resolve(process.cwd(), 'data/instagram.json')
const IMG_DIR = resolve(process.cwd(), 'public/social/ig')
const PER_ACCOUNT = 2 // 계정마다 싣는 게시물 수 (좋아요 많은 순)
const CANDIDATES = 6 // 계정마다 살펴보는 최근 게시물 수
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
    category: account === 'mathvisualproofs' || PROBLEM_WORDS.test(caption) ? '문제·증명' : '인기',
    publishedAt: date.toISOString(),
    likes,
    thumb: `/social/ig/${code}.jpg`,
  }
}

await mkdir(IMG_DIR, { recursive: true })

// 지난번에 읽어 둔 게시물(pool)은 다시 내려받지 않고 그대로 씀 → 매시간 돌려도 인스타그램에 부담을 주지 않음
let previous = { items: [], pool: [] }
try {
  previous = { items: [], pool: [], ...JSON.parse(await readFile(OUT_JSON, 'utf8')) }
} catch {}
const known = new Map([...previous.items, ...previous.pool].map((old) => [old.id, old]))

// "105K" / "1.2M" / "761" → 숫자
const likeCount = (item) => {
  const match = String(item.likes || '').match(/^([\d.,]+)([KM]?)/)
  return match ? Number(match[1].replace(/,/g, '')) * ({ K: 1e3, M: 1e6 }[match[2]] || 1) : 0
}

const now = new Date().toISOString()
const items = [] // 화면에 싣는 것: 계정별 좋아요 상위
const pool = [] // 후보 전체 (다음 실행 때 재사용)
const failedSources = new Set()
// 팔로워 수 (링크 미리보기 정보: '906K Followers, 40 Following, …')
async function followers(account) {
  const res = await fetch(`https://www.instagram.com/${account}/`, { headers: { 'User-Agent': PREVIEW_UA }, signal: AbortSignal.timeout(20000) })
  const match = meta(await res.text(), 'og:description').match(/^([\d.,]+)([KM]?) Followers/)
  return match ? Number(match[1].replace(/,/g, '')) * ({ K: 1e3, M: 1e6 }[match[2]] || 1) : null
}

for (const [account, lang, options = {}] of INSTAGRAM_ACCOUNTS) {
  try {
    const count = await followers(account).catch(() => null)
    if (count !== null && count < MIN_FOLLOWERS) {
      console.log(`-  건너뜀  @${account}: 팔로워 ${count}명 (${MIN_FOLLOWERS} 미만)`)
      continue
    }
    const grid = await evalOnPage(`https://www.instagram.com/${account}/`, READ_GRID)
    if (!grid?.length) throw new Error('게시물을 읽지 못함 (로그인 화면일 수 있음)')
    const candidates = []
    for (const post of grid.slice(0, CANDIDATES)) {
      const code = post.href.match(/\/(?:p|reel)\/([^/]+)/)?.[1]
      try {
        const item = known.get(`ig-${code}`) || (await readPost(post, account, lang))
        if (!item || Date.now() - new Date(item.publishedAt) > MAX_AGE_DAYS * DAY) continue
        if (options.filter && !EN_REQUIRE.test(`${item.title} ${item.summary}`)) continue // 수학과 무관한 글
        candidates.push(item)
      } catch (error) {
        console.warn(`  건너뜀 ${post.href}: ${error.message}`)
      }
    }
    // 인기 게시물: 좋아요가 많은 순으로 계정마다 PER_ACCOUNT 건
    const top = [...candidates].sort((x, y) => likeCount(y) - likeCount(x)).slice(0, PER_ACCOUNT)
    pool.push(...candidates)
    items.push(...top)
    console.log(`✓ ${String(top.length).padStart(2)}건  @${account} (후보 ${candidates.length}건 중 좋아요 상위: ${top.map((t) => t.likes || 0).join(', ')})`)
  } catch (error) {
    failedSources.add(`Instagram @${account}`)
    console.warn(`✗ 실패  @${account}: ${error.message}`)
  }
}

if (items.length === 0) {
  console.error('가져온 게시물이 없어 기존 data/instagram.json 을 그대로 둡니다.')
  process.exit(1)
}

// 이번에 못 읽은 계정의 카드는 사라지지 않게 지난번 것을 유지
for (const old of previous.items) {
  if (failedSources.has(old.source) && Date.now() - new Date(old.publishedAt) <= MAX_AGE_DAYS * DAY) items.push(old)
}
for (const old of previous.pool) if (failedSources.has(old.source)) pool.push(old)

// 실리는 게시물이 지난번과 같으면 아무것도 바꾸지 않고 끝냄 → 불필요한 커밋·배포가 안 생김
const ids = (list) => list.map((item) => item.id).sort().join(',')
if (ids(items) === ids(previous.items) && ids(pool) === ids(previous.pool)) {
  console.log('바뀐 게시물 없음 — 변경하지 않습니다.')
  process.exit(0)
}

// collectedAt(처음 실린 시각)은 한 번 정해지면 그대로 둠 → 새로 실린 게시물만 피드 맨 앞에 나옴
const firstSeen = new Map(previous.items.map((old) => [old.id, old.collectedAt]))
for (const item of items) item.collectedAt = firstSeen.get(item.id) || now

try {
  const { translated } = await translateItems([...items, ...pool])
  if (translated) console.log(`✓ 영어 게시물 ${translated}건 번역`)
} catch (error) {
  console.warn(`✗ 번역 실패: ${error.message}`)
}

items.sort((x, y) => likeCount(y) - likeCount(x))
await writeFile(OUT_JSON, JSON.stringify({ updatedAt: now, items, pool }, null, 2) + '\n')

// 더 이상 쓰지 않는 이미지 정리 (후보의 이미지는 남겨 둠)
const keep = new Set(pool.concat(items).map((item) => item.thumb.split('/').pop()))
for (const file of await readdir(IMG_DIR)) if (!keep.has(file)) await unlink(resolve(IMG_DIR, file))

console.log(`\n인스타그램 인기 게시물 ${items.length}건 → data/instagram.json`)
