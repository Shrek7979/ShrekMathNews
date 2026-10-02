// 로컬 실행기: 사이트(Next.js)를 띄우고, 매일 07:00 · 14:00 에 뉴스를 자동 수집합니다.
// 화면의 ↻ 버튼이 호출하는 즉시 수집 엔드포인트(3001 포트)도 여기서 띄웁니다.
// 실행: npm run local   (컴퓨터가 꺼져 있어 놓친 수집은 다음 실행 때 바로 보충)
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { collect, FEED_PATH } from './collect.mjs'

const COLLECT_HOURS = [7, 14]
const CONTROL_PORT = 3001
const MIN_MANUAL_INTERVAL = 10 * 60 * 1000
const CHECK_INTERVAL = 60 * 1000
const RETRY_INTERVAL = 15 * 60 * 1000

// 지금 시각 기준으로 가장 최근에 지나간 수집 시각
function lastSlot(now) {
  const slots = [-1, 0].flatMap((dayOffset) =>
    COLLECT_HOURS.map((hour) => {
      const slot = new Date(now)
      slot.setDate(slot.getDate() + dayOffset)
      slot.setHours(hour, 0, 0, 0)
      return slot
    })
  )
  return slots.filter((slot) => slot <= now).sort((a, b) => b - a)[0]
}

async function lastUpdated() {
  try {
    return new Date(JSON.parse(await readFile(FEED_PATH, 'utf8')).updatedAt)
  } catch {
    return new Date(0)
  }
}

let lastAttempt = 0
async function tick() {
  const now = new Date()
  if ((await lastUpdated()) >= lastSlot(now)) return
  if (now - lastAttempt < RETRY_INTERVAL) return
  lastAttempt = now.getTime()
  console.log(`\n[수집] ${now.toLocaleString('ko-KR')} 수학 뉴스 수집 시작`)
  try {
    await collect()
  } catch (error) {
    console.warn(`[수집] 실패: ${error.message} (15분 뒤 다시 시도)`)
  }
}

let running = false
async function manualCollect() {
  if (running) return [429, { error: '이미 수집 중이에요' }]
  if (Date.now() - (await lastUpdated()) < MIN_MANUAL_INTERVAL) {
    return [429, { error: '방금 수집했어요. 10분 뒤에 다시 시도해 주세요' }]
  }
  running = true
  try {
    return [200, await collect()]
  } catch (error) {
    return [500, { error: `수집에 실패했어요: ${error.message}` }]
  } finally {
    running = false
  }
}

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', `http://localhost:${process.env.PORT || 3000}`)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  if (req.method !== 'POST' || req.url !== '/collect') return res.writeHead(404).end()
  const [status, body] = await manualCollect()
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}).listen(CONTROL_PORT)

const mode = process.argv.includes('--prod') ? 'start' : 'dev'
const server = spawn('npx', ['next', mode], { stdio: 'inherit', shell: true })
server.on('exit', (code) => process.exit(code ?? 0))

tick()
setInterval(tick, CHECK_INTERVAL)
