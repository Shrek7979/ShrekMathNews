// 배포 직전에 실행: data/feed.json 의 섬네일 파일이 public/thumbs 에 없으면 다시 만듭니다.
// 섬네일 파일은 저장소에 올리지 않기 때문에(용량), 다른 컴퓨터(집 PC)에서 수집한 피드를
// 그대로 배포하면 그림이 깨질 수 있음 → 빌드 전에 빠진 것만 채움 (모두 있으면 바로 끝남)
// 그래도 못 만든 섬네일은 빌드 때 원문 이미지로 대신 보여 줌 (src/pages/index.tsx)
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { FEED_PATH } from './collect.mjs'
import { ensureThumbs } from './thumbs.mjs'

const feed = JSON.parse(await readFile(FEED_PATH, 'utf8'))
const missing = feed.items.filter((item) => item.thumb?.startsWith('/thumbs/') && !existsSync(resolve('public' + item.thumb)))
if (missing.length === 0) {
  console.log('섬네일 모두 있음')
} else {
  console.log(`빠진 섬네일 ${missing.length}건 다시 만드는 중…`)
  const { added } = await ensureThumbs(feed.items)
  await writeFile(FEED_PATH, JSON.stringify(feed, null, 2) + '\n')
  console.log(`✓ ${added}건 채움, 여전히 없는 카드 ${feed.items.filter((i) => !i.thumb).length}건`)
}
