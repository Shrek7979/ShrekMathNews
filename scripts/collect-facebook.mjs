// 페이스북 수학 페이지의 최신 게시물을 카드로 만듭니다 → data/facebook.json + public/social/fb/<id>.jpg
// 로그인 없이 공개 페이지에 보이는 게시물만 읽습니다(로그인하지 않으면 페이지마다 맨 위 1건만 보임).
// 실행: node scripts/collect-facebook.mjs   (또는 SNS-업데이트.bat)
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { evalOnPage } from './capture.mjs'
import { oneLine } from './collect.mjs'
import { FACEBOOK_PAGES } from './sources.mjs'
import { imageSize } from './thumbs.mjs'
import { translateItems } from './translate.mjs'

const OUT_JSON = resolve(process.cwd(), 'data/facebook.json')
const IMG_DIR = resolve(process.cwd(), 'public/social/fb')
const MAX_AGE_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

// 페이지 안에서 실행: 로그인 팝업을 걷어내고, 본문이 있는 첫 게시물(댓글 제외)을 읽음
async function readLatestPost() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  for (const dialog of document.querySelectorAll('[role="dialog"]')) {
    let target = dialog
    for (let node = dialog; node && node !== document.body; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') target = node
    }
    target.remove()
  }
  document.documentElement.style.overflow = 'auto'
  document.body.style.overflow = 'auto'
  window.scrollTo(0, 1200)
  await wait(2500)

  for (const article of document.querySelectorAll('[role="article"]')) {
    const message = article.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]')
    if (!message) continue // 본문 블록이 없는 것은 댓글
    const link = [...article.querySelectorAll('a[href]')]
      .map((a) => a.href.split('?')[0])
      .find((href) => /\/posts\/|\/videos\/|\/reel\/|\/photo|\/watch/.test(href))
    const image = [...article.querySelectorAll('img')]
      .filter((img) => img.naturalWidth >= 300)
      .sort((a, b) => b.naturalWidth - a.naturalWidth)[0]
    // 게시 시각: "1일 전", "23시간", "9월 30일" 같은 짧은 글자
    const when = [...article.querySelectorAll('a[href] span, a[href]')]
      .map((el) => el.innerText.trim())
      .find((text) => /^(\d+\s*(분|시간|일)( 전)?|\d+월 \d+일.*|어제.*)$/.test(text))
    return { text: message.innerText, link, image: image?.src, when }
  }
  return null
}

// "23시간" / "1일 전" / "9월 30일" → 날짜
function parseWhen(when) {
  const now = Date.now()
  const relative = when?.match(/^(\d+)\s*(분|시간|일)/)
  if (relative) {
    const unit = { 분: 60 * 1000, 시간: 60 * 60 * 1000, 일: DAY }[relative[2]]
    return new Date(now - Number(relative[1]) * unit)
  }
  if (/^어제/.test(when || '')) return new Date(now - DAY)
  const absolute = when?.match(/^(\d+)월 (\d+)일/)
  if (absolute) {
    const date = new Date(new Date().getFullYear(), Number(absolute[1]) - 1, Number(absolute[2]), 12)
    if (date > now) date.setFullYear(date.getFullYear() - 1)
    return date
  }
  return null
}

await mkdir(IMG_DIR, { recursive: true })
const items = []
for (const [slug, name, lang] of FACEBOOK_PAGES) {
  try {
    const post = await evalOnPage(`https://www.facebook.com/${slug}`, `(${readLatestPost.toString()})()`, { settleMs: 6000 })
    if (!post?.link) throw new Error('게시물을 읽지 못함 (로그인 화면일 수 있음)')
    const published = parseWhen(post.when)
    if (!published) throw new Error(`게시 시각을 알 수 없음: ${post.when}`)
    if (Date.now() - published > MAX_AGE_DAYS * DAY) throw new Error('최근 게시물 없음')
    if (!post.image) throw new Error('이미지 없는 게시물')

    const id = `fb-${createHash('sha1').update(post.link).digest('hex').slice(0, 12)}`
    const img = await fetch(post.image, { signal: AbortSignal.timeout(20000) })
    if (!img.ok) throw new Error(`이미지 HTTP ${img.status}`)
    const bytes = Buffer.from(await img.arrayBuffer())
    if ((imageSize(bytes)?.width || 0) < 300) throw new Error('이미지가 너무 작음')
    await writeFile(resolve(IMG_DIR, `${id}.jpg`), bytes)

    // 글이 소개하는 유튜브 영상(있으면). 같은 영상이 이미 카드로 있으면 화면에서 이 글을 뺌
    const refs = [...post.text.matchAll(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/g)].map((m) => m[1])
    // 본문에서 링크와 "더 보기"를 떼고, 첫 문장을 제목으로
    const text = post.text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/…?\s*더 보기\s*$/, '')
      .replace(/#[^\s#]+/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*[-–:]\s*$/, '')
      .trim()
    const firstSentence = text.match(/^.{8,80}?[.!?](?=\s|$)/)?.[0] || text.slice(0, 70)
    items.push({
      id,
      kind: /\/videos\/|\/reel\/|\/watch/.test(post.link) ? 'video' : 'news',
      lang,
      title: firstSentence || `${name} 페이스북 게시물`,
      summary: oneLine(text.slice(firstSentence.length).trim()),
      link: post.link,
      source: `Facebook ${name}`,
      category: '인기',
      publishedAt: published.toISOString(),
      thumb: `/social/fb/${id}.jpg`,
      refs,
    })
    console.log(`✓ ${name}: ${firstSentence.slice(0, 50)}`)
  } catch (error) {
    console.warn(`✗ ${name}: ${error.message}`)
  }
}

if (items.length === 0) {
  console.error('가져온 게시물이 없어 기존 data/facebook.json 을 그대로 둡니다.')
  process.exit(1)
}

// 이번에 못 읽은 페이지의 이전 게시물은 유지하고, 처음 가져온 시각(collectedAt)은 그대로 둠
const now = new Date().toISOString()
try {
  const previous = JSON.parse(await readFile(OUT_JSON, 'utf8')).items || []
  const known = new Map(previous.map((old) => [old.id, old]))
  for (const item of items) {
    const old = known.get(item.id)
    item.collectedAt = old?.collectedAt || now
    // 게시 시각은 "1일 전" 같은 상대 표현에서 계산하므로, 이미 아는 글은 처음 계산한 값을 유지
    if (old?.publishedAt) item.publishedAt = old.publishedAt
  }
  // 같은 게시물이 주소만 달리 잡히는 경우가 있어, 같은 페이지의 같은 글이면 중복으로 봄
  const seen = new Set(items.flatMap((item) => [item.id, `${item.source}|${item.title}`]))
  for (const old of previous) {
    const duplicate = seen.has(old.id) || seen.has(`${old.source}|${old.title}`)
    if (!duplicate && Date.now() - new Date(old.publishedAt) <= MAX_AGE_DAYS * DAY) items.push(old)
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
await writeFile(OUT_JSON, JSON.stringify({ updatedAt: now, items }, null, 2) + '\n')

const keep = new Set(items.map((item) => item.thumb.split('/').pop()))
for (const file of await readdir(IMG_DIR)) if (!keep.has(file)) await unlink(resolve(IMG_DIR, file))

console.log(`\n페이스북 게시물 ${items.length}건 → data/facebook.json`)
