// data/social.json 의 계정 카드(인스타그램·페이스북)를 실제 화면으로 캡처해 public/social/<id>.png 로 저장합니다.
// 해시태그 카드(#수학 등)는 불특정 게시물이 찍히므로 캡처하지 않고 글자 섬네일(.jpg)을 그대로 씁니다.
// 실행: node scripts/capture-social.mjs && python scripts/make-social-thumbs.py
//   (집 PC 에서 실행 후 커밋 — 서버 IP 에서는 로그인 화면만 나옴. 두 번째 명령이 PNG 를 <id>.cap.jpg 로 줄여 줌)
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { capturePage } from './capture.mjs'

const cards = JSON.parse(await readFile(resolve(process.cwd(), 'data/social.json'), 'utf8'))
// 계정 화면이 제대로 떴는지 확인할 요소 (로그인 화면이면 없음)
const REQUIRE = { Instagram: 'header img, main img', Facebook: '[role="main"] img' }

for (const card of cards) {
  if (card.label.startsWith('#')) continue
  const out = resolve(process.cwd(), 'public/social', `${card.id}.png`)
  try {
    await capturePage(card.link, out, { require: REQUIRE[card.platform], settleMs: 4500 })
    console.log('✓', card.id)
  } catch (error) {
    console.warn('✗', card.id, error.message)
  }
}
