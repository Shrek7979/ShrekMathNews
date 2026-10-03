// 웹 페이지 화면 캡처: 헤드리스 Edge/Chrome 을 DevTools 프로토콜로 조종해서
// 로그인·쿠키 팝업을 걷어낸 뒤 찍습니다. (단순 --screenshot 은 팝업이 그대로 찍힘)
// 시험: node scripts/capture.mjs <주소> <저장할.png>
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const WIDTH = 1200
const HEIGHT = 675
const SCALE = 1.5

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 페이지 안에서 실행: 화면을 가리는 팝업(로그인 유도, 쿠키 동의, 구독 권유)을 지움
const REMOVE_OVERLAYS = `(() => {
  const vw = innerWidth, vh = innerHeight
  // 1) 대화상자와, 그것을 감싼 화면 고정 배경(어둡게 깔리는 막)까지 함께 제거
  for (const dialog of document.querySelectorAll('[role="dialog"], [aria-modal="true"]')) {
    let target = dialog
    for (let node = dialog; node && node !== document.body; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') target = node
    }
    target.remove()
  }
  // 2) 화면 아래쪽에 붙은 넓은 고정 배너(쿠키 동의, 앱 설치 권유)
  for (const el of document.querySelectorAll('body *')) {
    if (getComputedStyle(el).position !== 'fixed') continue
    const r = el.getBoundingClientRect()
    if (r.width > vw * 0.6 && r.top > vh * 0.55 && r.height > 50) el.remove()
  }
  // 3) 팝업 뒤에 깔려 화면 전체를 흐리게 덮는 반투명 막
  for (const el of document.querySelectorAll('body *')) {
    const style = getComputedStyle(el)
    if (style.position !== 'fixed' && style.position !== 'absolute') continue
    const r = el.getBoundingClientRect()
    if (r.width < vw * 0.9 || r.height < vh * 0.9) continue
    // (정규식 대신 문자열로 처리: 이 코드는 템플릿 문자열 안이라 역슬래시가 사라짐)
    const color = style.backgroundColor
    const alpha = color.startsWith('rgba(') ? Number(color.slice(5, -1).split(',')[3]) : 1
    if (alpha > 0 && alpha < 1 && el.innerText.trim().length < 20) el.remove()
  }
  // 4) 팝업이 걸어 둔 스크롤 잠금 해제
  for (const el of [document.documentElement, document.body]) el.style.setProperty('overflow', 'auto', 'important')
  scrollTo(0, 0)
  return document.title
})()`

// 헤드리스 브라우저로 페이지를 연 뒤 work(send) 를 실행. send 는 DevTools 프로토콜 명령을 보내는 함수
async function withPage(url, settleMs, work) {
  const browser = BROWSERS.find((path) => existsSync(path))
  if (!browser) throw new Error('헤드리스 브라우저 없음')

  const port = 9400 + Math.floor(Math.random() * 500)
  const profile = mkdtempSync(join(tmpdir(), 'capture-'))
  const child = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--disable-sync',
      '--hide-scrollbars',
      '--no-sandbox', // GitHub Actions 러너에서는 샌드박스를 쓸 수 없음
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true }
  )

  let ws
  const killTimer = setTimeout(() => child.kill(), 45000) // 어떤 경우에도 45초 뒤엔 정리
  try {
    let target
    for (let i = 0; i < 60 && !target; i++) {
      await sleep(250)
      try {
        const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
        target = pages.find((page) => page.type === 'page')
      } catch {}
    }
    if (!target) throw new Error('브라우저 연결 실패')

    ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = () => reject(new Error('DevTools 연결 실패'))
    })
    let nextId = 0
    const pending = new Map()
    let loaded = false
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.method === 'Page.loadEventFired') loaded = true
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message)
        pending.delete(message.id)
      }
    }
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = ++nextId
        pending.set(id, resolve)
        ws.send(JSON.stringify({ id, method, params }))
      })

    await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: false })
    await send('Emulation.setUserAgentOverride', { userAgent: UA, acceptLanguage: 'ko-KR,ko;q=0.9,en;q=0.8' })
    await send('Page.enable')
    await send('Page.navigate', { url })
    for (let i = 0; i < 48 && !loaded; i++) await sleep(250) // 최대 12초까지 로딩 대기
    await sleep(settleMs)
    return await work(send)
  } finally {
    clearTimeout(killTimer)
    try {
      ws?.close()
    } catch {}
    child.kill()
    await sleep(300)
    try {
      rmSync(profile, { recursive: true, force: true })
    } catch {}
  }
}

// require: 이 CSS 선택자에 맞는 요소가 없으면 실패로 처리 (차단·로그인 화면을 섬네일로 쓰지 않기 위함)
export function capturePage(url, outPath, { settleMs = 3500, require } = {}) {
  return withPage(url, settleMs, async (send) => {
    await send('Runtime.evaluate', { expression: REMOVE_OVERLAYS })
    await sleep(600)
    await send('Runtime.evaluate', { expression: REMOVE_OVERLAYS }) // 지운 뒤 다시 뜨는 팝업 한 번 더
    await sleep(400)
    if (require) {
      const found = await send('Runtime.evaluate', { expression: `!!document.querySelector(${JSON.stringify(require)})` })
      if (!found.result?.result?.value) throw new Error(`필요한 내용이 없음: ${require}`)
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    if (!shot.result?.data) throw new Error('캡처 실패')
    await writeFile(outPath, Buffer.from(shot.result.data, 'base64'))
  })
}

// 페이지 안에서 자바스크립트 식을 실행하고 그 값을 돌려줌 (화면에 보이는 목록을 읽어 올 때 사용)
export function evalOnPage(url, expression, { settleMs = 5000 } = {}) {
  return withPage(url, settleMs, async (send) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    const failure = result.result?.exceptionDetails
    if (failure) throw new Error(`페이지 스크립트 오류: ${failure.exception?.description || failure.text}`)
    return result.result?.result?.value
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [url, out] = process.argv.slice(2)
  capturePage(url, out).then(
    () => console.log('saved', out),
    (error) => {
      console.error(error.message)
      process.exit(1)
    }
  )
}
