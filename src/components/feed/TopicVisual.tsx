import React, { useEffect, useRef, useState } from 'react'

// 수학 주제 카드 위쪽에 들어가는 움직이는 그림.
// 모든 그림은 "시간 t(초)의 함수"로만 그려서, 나중에 같은 화면을 영상으로 찍어내기도 쉽게 함.

const YELLOW = '#fde047'
const WHITE = '#ffffff'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
// t 가 a→b 로 갈 때 0→1 로 변하는 진행률
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))

// 카드가 화면에 보이는 동안만 0 → duration 을 반복해서 흐르는 시계
function useLoop(duration: number) {
  const ref = useRef<SVGSVGElement>(null)
  const [t, setT] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 주소에 ?frame=초 를 붙이면 그 시점의 장면으로 고정 (장면 점검·영상 캡처용)
    const frame = new URLSearchParams(window.location.search).get('frame')
    if (frame !== null && !isNaN(Number(frame))) {
      setT(Math.min(Number(frame), duration - 0.01))
      return
    }
    // 움직임 줄이기를 켠 사용자에게는 완성된 마지막 장면만 보여 줌
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setT(duration - 0.01)
      return
    }
    let raf = 0
    let start = 0
    let running = false
    const tick = (now: number) => {
      if (!start) start = now
      setT(((now - start) / 1000) % duration)
      raf = requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true
          start = 0
          raf = requestAnimationFrame(tick)
        } else if (!entry.isIntersecting && running) {
          running = false
          cancelAnimationFrame(raf)
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [duration])

  return { ref, t }
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <text x={200} y={228} textAnchor="middle" fontSize={15} fontWeight={700} fill={WHITE}>
      {children}
    </text>
  )
}

// ── 쾨니히스베르크의 다리: 지도 → 그래프 → 차수 → 결론 ─────────────────────────
const LAND = { A: [200, 34], B: [200, 176], C: [150, 105], D: [330, 105] } as const
const BRIDGES: [number, number, number, number][] = [
  [125, 62, 125, 84], // A–C
  [175, 62, 175, 84], // A–C
  [125, 126, 125, 148], // B–C
  [175, 126, 175, 148], // B–C
  [204, 105, 268, 105], // C–D
  [330, 62, 330, 86], // A–D
  [330, 124, 330, 148], // B–D
]
const EDGES = [
  'M200 34 Q150 55 150 105',
  'M200 34 Q205 85 150 105',
  'M200 176 Q150 155 150 105',
  'M200 176 Q205 125 150 105',
  'M150 105 L330 105',
  'M200 34 L330 105',
  'M200 176 L330 105',
]
const DEGREES: [keyof typeof LAND, number, number][] = [
  ['A', 3, 5.0],
  ['B', 3, 5.6],
  ['D', 3, 6.2],
  ['C', 5, 6.8],
]

function Konigsberg() {
  const { ref, t } = useLoop(12)
  const graph = ramp(t, 3, 4.5)
  const caption =
    t < 3
      ? '다리 7개를 한 번씩만 건널 수 있을까?'
      : t < 5
      ? '땅은 점으로, 다리는 선으로'
      : t < 8.5
      ? '점마다 연결된 선의 개수를 세면'
      : '홀수점이 4개 → 한붓그리기 불가능!'

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      <g opacity={1 - graph * 0.78}>
        <rect x={0} y={62} width={400} height={86} fill="#38bdf8" opacity={0.55} />
        <rect x={0} y={8} width={400} height={54} rx={6} fill="#4ade80" opacity={0.75} />
        <rect x={0} y={148} width={400} height={54} rx={6} fill="#4ade80" opacity={0.75} />
        <ellipse cx={150} cy={105} rx={56} ry={21} fill="#4ade80" opacity={0.9} />
        <polygon points="268,105 400,84 400,126" fill="#4ade80" opacity={0.9} />
        {BRIDGES.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#fef3c7"
            strokeWidth={9}
            strokeLinecap="round"
            opacity={ramp(t, 0.4 + i * 0.3, 0.7 + i * 0.3)}
          />
        ))}
      </g>

      <g opacity={graph}>
        {EDGES.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={WHITE} strokeWidth={2.5} />
        ))}
        {(Object.keys(LAND) as (keyof typeof LAND)[]).map((name) => (
          <g key={name}>
            <circle cx={LAND[name][0]} cy={LAND[name][1]} r={13} fill="#1e1b4b" stroke={WHITE} strokeWidth={2.5} />
            <text x={LAND[name][0]} y={LAND[name][1] + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={WHITE}>
              {name}
            </text>
          </g>
        ))}
      </g>

      {DEGREES.map(([name, degree, at]) => {
        const show = ramp(t, at, at + 0.4)
        const dx = name === 'C' ? -34 : 30
        return (
          <g key={name} opacity={show} transform={`translate(${LAND[name][0] + dx} ${LAND[name][1] + 6})`}>
            <text textAnchor="middle" fontSize={17 + (1 - show) * 10} fontWeight={800} fill={YELLOW}>
              {degree}
            </text>
          </g>
        )
      })}

      <Caption>{caption}</Caption>
    </svg>
  )
}

// ── 피보나치 정사각형과 황금 나선 ─────────────────────────────────────────────
const FIB = [1, 1, 2, 3, 5, 8, 13, 21]

// 정사각형을 오른쪽 → 아래 → 왼쪽 → 위 순서로 붙여 나가며, 각 정사각형 안의 사분원 정보를 계산
const FIB_SQUARES = (() => {
  const squares: { x: number; y: number; size: number; arc: string }[] = []
  const boxes: number[][] = [] // i번째 정사각형까지 그렸을 때의 전체 범위 [x, y, 폭, 높이]
  let [x0, y0, x1, y1] = [0, 0, 1, 1]
  squares.push({ x: 0, y: 0, size: 1, arc: 'M0 1 A1 1 0 0 1 1 0' })
  boxes.push([x0, y0, x1 - x0, y1 - y0])
  FIB.slice(1).forEach((size, i) => {
    const dir = i % 4
    let x = 0
    let y = 0
    let arc = ''
    if (dir === 0) {
      ;[x, y] = [x1, y0]
      arc = `M${x} ${y} A${size} ${size} 0 0 1 ${x + size} ${y + size}`
      x1 += size
    } else if (dir === 1) {
      ;[x, y] = [x0, y1]
      arc = `M${x + size} ${y} A${size} ${size} 0 0 1 ${x} ${y + size}`
      y1 += size
    } else if (dir === 2) {
      ;[x, y] = [x0 - size, y0]
      arc = `M${x + size} ${y + size} A${size} ${size} 0 0 1 ${x} ${y}`
      x0 -= size
    } else {
      ;[x, y] = [x0, y0 - size]
      arc = `M${x} ${y + size} A${size} ${size} 0 0 1 ${x + size} ${y}`
      y0 -= size
    }
    squares.push({ x, y, size, arc })
    boxes.push([x0, y0, x1 - x0, y1 - y0])
  })
  return { squares, boxes }
})()

function Fibonacci() {
  const { ref, t } = useLoop(12)
  const { squares, boxes } = FIB_SQUARES
  // 카메라: 정사각형이 늘어날 때마다 전체가 보이도록 부드럽게 줌아웃
  // (다음 정사각형이 나타나기 직전 구간에서만 움직여, 새 정사각형이 화면 밖에 생기지 않게 함)
  const progress = Math.max(2, Math.min(FIB.length - 1, (t - 0.5) / 1.05))
  const from = boxes[Math.floor(progress)]
  const to = boxes[Math.min(FIB.length - 1, Math.floor(progress) + 1)]
  const move = ramp(progress % 1, 0.5, 1)
  const ease = move * move * (3 - 2 * move)
  const box = from.map((v, i) => v + (to[i] - v) * ease)
  const scale = Math.min(380 / box[2], 178 / box[3])
  const offsetX = (400 - box[2] * scale) / 2 - box[0] * scale
  const offsetY = 8 + (178 - box[3] * scale) / 2 - box[1] * scale
  const latest = Math.min(FIB.length - 1, Math.max(1, Math.floor((t - 0.5) / 1.05)))
  const ratio = (FIB[latest] / FIB[latest - 1]).toFixed(3)

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      <g transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
        {squares.map((s, i) => {
          const show = ramp(t, 0.5 + i * 1.05, 1.0 + i * 1.05)
          const draw = ramp(t, 0.7 + i * 1.05, 1.5 + i * 1.05)
          return (
            <g key={i} opacity={show}>
              <rect x={s.x} y={s.y} width={s.size} height={s.size} fill={WHITE} fillOpacity={0.07} stroke={WHITE} strokeOpacity={0.55} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
              {s.size >= 2 && (
                <text x={s.x + s.size / 2} y={s.y + s.size / 2 + s.size * 0.12} textAnchor="middle" fontSize={Math.min(s.size * 0.38, 5)} fontWeight={700} fill={WHITE} fillOpacity={0.5}>
                  {s.size}
                </text>
              )}
              <path d={s.arc} fill="none" stroke={YELLOW} strokeWidth={3 / scale} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            </g>
          )
        })}
      </g>
      <Caption>
        {t < 9.6 ? `${FIB[latest]} ÷ ${FIB[latest - 1]} = ${ratio}` : '이웃한 항의 비 → 황금비 φ = 1.618…'}
      </Caption>
    </svg>
  )
}

// ── 생일 문제: 인원이 늘 때 "생일이 같은 쌍이 있을 확률" 곡선 ──────────────────────
const BIRTHDAY_P = (() => {
  const p = [0, 0]
  let allDifferent = 1
  for (let n = 2; n <= 60; n++) {
    allDifferent *= (365 - (n - 1)) / 365
    p[n] = 1 - allDifferent
  }
  return p
})()

function Birthday() {
  const { ref, t } = useLoop(12)
  const people = Math.round(t < 7 ? 1 + 22 * ramp(t, 0.5, 5) : 23 + 37 * ramp(t, 7, 10))
  const px = (n: number) => 48 + (n / 60) * 330
  const py = (p: number) => 188 - p * 160
  const curve = BIRTHDAY_P.slice(1, people + 1)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i + 1).toFixed(1)} ${py(p).toFixed(1)}`)
    .join(' ')
  const reached23 = people >= 23

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      {/* 축과 눈금 */}
      <line x1={48} y1={188} x2={382} y2={188} stroke={WHITE} strokeOpacity={0.5} />
      <line x1={48} y1={24} x2={48} y2={188} stroke={WHITE} strokeOpacity={0.5} />
      {[0.5, 1].map((p) => (
        <g key={p}>
          <line x1={48} y1={py(p)} x2={382} y2={py(p)} stroke={WHITE} strokeOpacity={0.15} strokeDasharray="4 4" />
          <text x={42} y={py(p) + 4} textAnchor="end" fontSize={11} fill={WHITE} fillOpacity={0.7}>
            {p * 100}%
          </text>
        </g>
      ))}
      {[0, 23, 60].map((n) => (
        <text key={n} x={px(n)} y={203} textAnchor="middle" fontSize={11} fill={n === 23 && reached23 ? YELLOW : WHITE} fillOpacity={n === 23 && reached23 ? 1 : 0.7}>
          {n}명
        </text>
      ))}

      {reached23 && (
        <g>
          <line x1={px(23)} y1={188} x2={px(23)} y2={py(BIRTHDAY_P[23])} stroke={YELLOW} strokeDasharray="4 3" />
          <line x1={48} y1={py(BIRTHDAY_P[23])} x2={px(23)} y2={py(BIRTHDAY_P[23])} stroke={YELLOW} strokeDasharray="4 3" />
          <circle cx={px(23)} cy={py(BIRTHDAY_P[23])} r={4.5} fill={YELLOW} />
        </g>
      )}

      <path d={curve} fill="none" stroke={WHITE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={px(people)} cy={py(BIRTHDAY_P[people])} r={5} fill={WHITE} />

      <text x={372} y={150} textAnchor="end" fontSize={30} fontWeight={800} fill={reached23 && t < 7 ? YELLOW : WHITE}>
        {(BIRTHDAY_P[people] * 100).toFixed(1)}%
      </text>
      <text x={372} y={170} textAnchor="end" fontSize={13} fontWeight={700} fill={WHITE} fillOpacity={0.8}>
        {people}명일 때
      </text>

      <Caption>
        {t < 5 ? '생일이 같은 쌍이 있을 확률' : t < 7 ? '23명이면 벌써 절반을 넘는다!' : '60명이면 99.4% — 거의 확실'}
      </Caption>
    </svg>
  )
}

const VISUALS: Record<string, () => JSX.Element> = {
  'topic-konigsberg': Konigsberg,
  'topic-fibonacci': Fibonacci,
  'topic-birthday': Birthday,
}

export const hasTopicVisual = (topicId: string) => topicId in VISUALS

export default function TopicVisual({ topicId }: { topicId: string }) {
  const Visual = VISUALS[topicId]
  return Visual ? <Visual /> : null
}
