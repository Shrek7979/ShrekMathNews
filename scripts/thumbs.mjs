// 카드 섬네일 확보: 고해상도 후보(유튜브 maxres, 기사 og:image 원본)부터 받아 보고,
// 폭 900px 이상이면 바로 채택, 아니면 가장 큰 것을 쓰되 너무 작으면 헤드리스 브라우저로 2배 캡처.
// public/thumbs/<id>.<ext> 로 저장하고 item.thumb 에 경로를 기록합니다.
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as cheerio from 'cheerio'
import { capturePage } from './capture.mjs'

const THUMB_DIR = resolve(process.cwd(), 'public/thumbs')
const MIN_BYTES = 3000
const GOOD_WIDTH = 900 // 이 폭 이상이면 더 찾지 않음 (폰 3배 화면에서도 선명)
const WEAK_WIDTH = 500 // 이 폭 미만이면 화면 캡처가 더 낫다고 봄
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const extFor = (type) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[type]

// 이미지 헤더만 읽어 폭·높이를 구함 (외부 라이브러리 없이 JPEG/PNG/GIF/WebP)
export function imageSize(buf) {
  if (buf.length < 30) return null
  if (buf.toString('ascii', 1, 4) === 'PNG') return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  if (buf.toString('ascii', 0, 3) === 'GIF') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16)
    if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null
      const marker = buf[i + 1]
      const isSOF = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
      if (isSOF) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) }
      i += 2 + buf.readUInt16BE(i + 2)
    }
  }
  return null
}

async function fetchImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ext = extFor((res.headers.get('content-type') || '').split(';')[0].trim())
  if (!ext) throw new Error('이미지가 아님')
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length < MIN_BYTES) throw new Error('너무 작은 이미지')
  const size = imageSize(bytes)
  if (!size) throw new Error('크기를 읽을 수 없음')
  return { bytes, ext, width: size.width }
}

async function findOgImage(pageUrl) {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const $ = cheerio.load(await res.text())
  const candidate =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[property="og:image:url"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content')
  if (!candidate) throw new Error('og:image 없음')
  return new URL(candidate, res.url).href
}

// 같은 이미지의 더 큰 버전 주소를 추정
function upscaleVariants(url) {
  const variants = []
  // 유튜브: hqdefault(480px) → maxresdefault(1280px)
  const yt = url.match(/^https?:\/\/i\d?\.ytimg\.com\/vi\/([^/]+)\//)
  if (yt) variants.push(`https://i.ytimg.com/vi/${yt[1]}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${yt[1]}/sddefault.jpg`)
  // 국내 언론사 CMS: /news/thumbnail/…_v150.jpg → /news/photo/….jpg (원본)
  if (/\/news\/thumbnail\/.*_v\d+\.\w+$/.test(url)) {
    variants.push(url.replace('/news/thumbnail/', '/news/photo/').replace(/_v\d+(\.\w+)$/, '$1'))
  }
  return variants
}

// 기사 화면 캡처 (로그인·쿠키 팝업은 scripts/capture.mjs 가 걷어냄)
async function screenshot(pageUrl, id, options) {
  const out = resolve(THUMB_DIR, `${id}.png`)
  await capturePage(pageUrl, out, options)
  if ((await stat(out)).size < MIN_BYTES) throw new Error('캡처 실패')
  return `/thumbs/${id}.png`
}

const isReddit = (item) => /^Reddit/.test(item.source || '')
const REDDIT_FALLBACK = '/social/reddit.jpg'

async function ensureThumb(item) {
  // 레딧 글: og:image 가 모든 글에 똑같은 로고라 쓸모없음 → 글 화면을 캡처.
  // 서버 IP 가 차단돼 글 본문이 안 보이면(shreddit-post 없음) 공용 섬네일로 대체
  if (isReddit(item) && !item.image) {
    try {
      return await screenshot(item.link, item.id, { require: 'shreddit-post' })
    } catch {
      return REDDIT_FALLBACK
    }
  }

  // 고해상도일 가능성이 높은 순서로 후보를 모음
  const urls = []
  if (item.image) urls.push(...upscaleVariants(item.image))
  if (item.kind !== 'video') {
    try {
      const og = await findOgImage(item.link)
      urls.push(...upscaleVariants(og), og)
    } catch {}
  }
  if (item.image) urls.push(item.image)

  let best = null
  for (const url of [...new Set(urls)]) {
    try {
      const img = await fetchImage(url)
      if (!best || img.width > best.width) best = img
      if (best.width >= GOOD_WIDTH) break
    } catch {}
  }

  // 작은 이미지뿐이면 기사 화면을 크게 캡처하는 쪽이 더 깨끗함
  if (item.kind !== 'video' && (!best || best.width < WEAK_WIDTH)) {
    try {
      return await screenshot(item.link, item.id)
    } catch {}
  }
  if (!best) return null
  await writeFile(resolve(THUMB_DIR, `${item.id}.${best.ext}`), best.bytes)
  return `/thumbs/${item.id}.${best.ext}`
}

// 피드 항목마다 섬네일을 채우고, 피드에서 사라진 항목의 파일은 정리
export async function ensureThumbs(items) {
  await mkdir(THUMB_DIR, { recursive: true })
  const existing = new Set(await readdir(THUMB_DIR))
  let added = 0

  for (const item of items) {
    const found = Array.from(existing).find((file) => file.startsWith(`${item.id}.`))
    if (found) {
      item.thumb = `/thumbs/${found}`
      continue
    }
    item.thumb = await ensureThumb(item)
    if (item.thumb?.startsWith('/thumbs/')) {
      existing.add(item.thumb.replace('/thumbs/', ''))
      added++
    }
  }

  const keep = new Set(items.map((item) => item.thumb?.replace('/thumbs/', '')).filter(Boolean))
  for (const file of existing) {
    if (!keep.has(file)) await unlink(resolve(THUMB_DIR, file)).catch(() => {})
  }
  return { added }
}
