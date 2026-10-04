import type { Topic } from './feed'

// 수학 주제 카드의 지금 보이는 장면(그림 + 설명)을 PNG 한 장으로 저장 → 학습지·수업 자료에 붙여 쓰기 위함

const WIDTH = 1080
const HEIGHT = 1350
const VISUAL_HEIGHT = 648 // 그림은 400×240 비율 그대로 확대
const PADDING = 72
const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

// SVG 를 그 순간의 모습 그대로 이미지로 바꿈
function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(WIDTH))
  clone.setAttribute('height', String(VISUAL_HEIGHT))
  clone.setAttribute('font-family', FONT)
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => reject(new Error('그림을 이미지로 바꾸지 못했습니다'))
    image.src = url
  })
}

// 폭에 맞춰 줄바꿈 (띄어쓰기 단위, 한 단어가 너무 길면 글자 단위)
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      line = word
      while (ctx.measureText(line).width > maxWidth) {
        let cut = line.length - 1
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    lines.push(line)
  }
  return lines
}

export async function saveTopicImage(topic: Topic, slideIndex: number, svg: SVGSVGElement | null) {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#171717'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  let y = PADDING
  if (svg) {
    ctx.fillStyle = '#1e1b4b'
    ctx.fillRect(0, 0, WIDTH, VISUAL_HEIGHT)
    ctx.drawImage(await svgToImage(svg), 0, 0, WIDTH, VISUAL_HEIGHT)
    y = VISUAL_HEIGHT + PADDING
  }

  const textWidth = WIDTH - PADDING * 2
  const draw = (text: string, font: string, color: string, lineHeight: number, gapAfter: number) => {
    ctx.font = font
    ctx.fillStyle = color
    ctx.textBaseline = 'top'
    for (const line of wrap(ctx, text, textWidth)) {
      ctx.fillText(line, PADDING, y)
      y += lineHeight
    }
    y += gapAfter
  }

  const slide = topic.slides[slideIndex]
  draw(`수학 · ${topic.tag}`, `600 30px ${FONT}`, '#e879f9', 40, 12)
  draw(topic.title, `700 52px ${FONT}`, '#ffffff', 68, 28)
  draw(slide.heading, `700 40px ${FONT}`, '#fde047', 54, 14)
  for (const paragraph of slide.body.split(/\n{2,}/)) draw(paragraph, `400 33px ${FONT}`, '#d4d4d4', 52, 20)

  ctx.font = `600 26px ${FONT}`
  ctx.fillStyle = '#737373'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('Shrek Math News', PADDING, HEIGHT - 48)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('이미지를 만들지 못했습니다')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${topic.title.replace(/[\\/:*?"<>|]/g, '')}-${slideIndex + 1}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
