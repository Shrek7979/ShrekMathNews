// 카드 섬네일 확보: 피드 이미지 → 기사 og:image → 헤드리스 브라우저 캡처 순으로 시도해
// public/thumbs/<id>.<ext> 로 저장하고 item.thumb 에 경로를 기록합니다.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import * as cheerio from 'cheerio'

const THUMB_DIR = resolve(process.cwd(), 'public/thumbs')
const MIN_BYTES = 3000
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]
const run = promisify(execFile)

const extFor = (type) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[type]

async function downloadImage(url, id) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ext = extFor((res.headers.get('content-type') || '').split(';')[0].trim())
  if (!ext) throw new Error('이미지가 아님')
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length < MIN_BYTES) throw new Error('너무 작은 이미지')
  await writeFile(resolve(THUMB_DIR, `${id}.${ext}`), bytes)
  return `/thumbs/${id}.${ext}`
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

async function screenshot(pageUrl, id) {
  const browser = BROWSERS.find((path) => existsSync(path))
  if (!browser) throw new Error('헤드리스 브라우저 없음')
  const out = resolve(THUMB_DIR, `${id}.png`)
  await run(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--disable-sync',
      `--user-data-dir=${resolve(process.cwd(), '.cache/headless-profile')}`,
      '--window-size=1200,675',
      '--virtual-time-budget=8000',
      `--screenshot=${out}`,
      pageUrl,
    ],
    { timeout: 60000, windowsHide: true }
  )
  if ((await stat(out)).size < MIN_BYTES) throw new Error('캡처 실패')
  return `/thumbs/${id}.png`
}

async function ensureThumb(item) {
  const attempts = [
    item.image && (() => downloadImage(item.image, item.id)),
    item.kind !== 'video' && (async () => downloadImage(await findOgImage(item.link), item.id)),
    item.kind !== 'video' && (() => screenshot(item.link, item.id)),
  ].filter(Boolean)

  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch {}
  }
  return null
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
    if (item.thumb) {
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
