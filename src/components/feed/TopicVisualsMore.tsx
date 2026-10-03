import React from 'react'
import { Caption, WHITE, YELLOW, ramp, useLoop } from './topicVisualKit'

// 나머지 수학 주제 9개의 움직이는 그림. 모두 viewBox 400×240, 12초 반복.

const GREEN = '#4ade80'
const RED = '#fb7185'
const SKY = '#7dd3fc'

// ── 오일러 항등식: 단위원 위를 도는 점 e^(ix) ────────────────────────────────
function EulerIdentity() {
  const { ref, t } = useLoop(12)
  const [cx, cy, r] = [130, 108, 78]
  const angle = Math.PI * ramp(t, 1, 7)
  const [px, py] = [cx + r * Math.cos(angle), cy - r * Math.sin(angle)]
  const arrived = t >= 7
  const largeArc = 0
  const arcEnd = [cx + 26 * Math.cos(angle), cy - 26 * Math.sin(angle)]

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      <line x1={30} y1={cy} x2={230} y2={cy} stroke={WHITE} strokeOpacity={0.4} />
      <line x1={cx} y1={18} x2={cx} y2={198} stroke={WHITE} strokeOpacity={0.4} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={WHITE} strokeOpacity={0.6} strokeWidth={1.5} />
      <text x={cx + r + 6} y={cy + 15} fontSize={12} fill={WHITE} fillOpacity={0.7}>1</text>
      <text x={cx - r - 20} y={cy + 15} fontSize={12} fill={arrived ? YELLOW : WHITE} fillOpacity={arrived ? 1 : 0.7}>−1</text>
      <text x={cx + 5} y={cy - r - 4} fontSize={12} fill={WHITE} fillOpacity={0.7}>i</text>

      {/* 지나온 호와 각 */}
      <path
        d={`M${cx + r} ${cy} A${r} ${r} 0 ${largeArc} 0 ${px} ${py}`}
        fill="none"
        stroke={YELLOW}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {angle > 0.05 && (
        <path d={`M${cx + 26} ${cy} A26 26 0 0 0 ${arcEnd[0]} ${arcEnd[1]}`} fill="none" stroke={SKY} strokeWidth={2} />
      )}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={WHITE} strokeWidth={2} />
      <circle cx={px} cy={py} r={7} fill={YELLOW} stroke="#1e1b4b" strokeWidth={2} />

      <text x={255} y={62} fontSize={15} fontWeight={700} fill={SKY}>
        x = {(angle / Math.PI).toFixed(2)}π
      </text>
      <text x={255} y={100} fontSize={19} fontWeight={800} fill={WHITE}>
        e^(ix)
      </text>
      <text x={255} y={124} fontSize={13} fill={WHITE} fillOpacity={0.8}>
        = cos x + i sin x
      </text>
      <g opacity={ramp(t, 7.2, 8)}>
        <text x={255} y={160} fontSize={19} fontWeight={800} fill={YELLOW}>
          e^(iπ) = −1
        </text>
      </g>
      <g opacity={ramp(t, 9, 9.8)}>
        <text x={255} y={190} fontSize={19} fontWeight={800} fill={YELLOW}>
          e^(iπ) + 1 = 0
        </text>
      </g>

      <Caption>{arrived ? '반 바퀴(π)를 돌면 −1 에 도착한다' : 'e^(ix) 는 단위원 위를 x 라디안만큼 도는 점'}</Caption>
    </svg>
  )
}

// ── 몬티 홀: 고르고 → 사회자가 열고 → 확률 비교 ───────────────────────────────
function MontyHall() {
  const { ref, t } = useLoop(12)
  const doors = [52, 160, 268]
  const picked = ramp(t, 2, 2.6)
  const opened = ramp(t, 4.2, 5)
  const probs = ramp(t, 6.4, 7.2)
  const caption =
    t < 2
      ? '문 세 개 중 하나에만 자동차가 있다'
      : t < 4.2
      ? '1번 문을 골랐다'
      : t < 6.4
      ? '사회자가 염소가 있는 3번 문을 열어 준다'
      : t < 9.5
      ? '처음 고른 문은 여전히 1/3'
      : '바꾸면 당첨 확률이 2/3 — 두 배!'

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      {doors.map((x, i) => {
        const isOpen = i === 2 && opened > 0
        return (
          <g key={i}>
            <rect
              x={x}
              y={22}
              width={80}
              height={118}
              rx={6}
              fill={isOpen ? '#0f172a' : '#b45309'}
              fillOpacity={isOpen ? 0.5 + 0.4 * opened : 0.9}
              stroke={i === 0 && picked > 0 ? YELLOW : WHITE}
              strokeOpacity={i === 0 && picked > 0 ? 1 : 0.6}
              strokeWidth={i === 0 ? 2 + 3 * picked : 2}
            />
            {!isOpen && <circle cx={x + 66} cy={84} r={4} fill={YELLOW} />}
            <text x={x + 40} y={isOpen ? 76 : 70} textAnchor="middle" fontSize={isOpen ? 20 : 30} fontWeight={800} fill={WHITE} fillOpacity={isOpen ? opened : 0.9}>
              {isOpen ? '염소' : i + 1}
            </text>
            {isOpen && (
              <text x={x + 40} y={102} textAnchor="middle" fontSize={12} fill={WHITE} fillOpacity={0.7 * opened}>
                (꽝)
              </text>
            )}
          </g>
        )
      })}
      <text x={92} y={158} textAnchor="middle" fontSize={12} fontWeight={700} fill={YELLOW} opacity={picked}>
        내 선택
      </text>

      <g opacity={probs}>
        <text x={92} y={196} textAnchor="middle" fontSize={26} fontWeight={800} fill={WHITE}>
          1/3
        </text>
        <text x={200} y={196} textAnchor="middle" fontSize={26 + 8 * ramp(t, 9.5, 10.2)} fontWeight={800} fill={YELLOW}>
          2/3
        </text>
        <text x={308} y={196} textAnchor="middle" fontSize={26} fontWeight={800} fill={WHITE} fillOpacity={0.4}>
          0
        </text>
      </g>

      <Caption>{caption}</Caption>
    </svg>
  )
}

// ── 바젤 문제: 부분합이 π²/6 으로 다가감 ──────────────────────────────────────
const BASEL = (() => {
  const sums = [0]
  for (let n = 1; n <= 40; n++) sums[n] = sums[n - 1] + 1 / (n * n)
  return sums
})()
const BASEL_LIMIT = (Math.PI * Math.PI) / 6

function Basel() {
  const { ref, t } = useLoop(12)
  const n = Math.max(1, Math.round(1 + 39 * ramp(t, 0.5, 8.5) ** 1.6))
  const px = (k: number) => 46 + (k / 40) * 336
  const py = (v: number) => 186 - ((v - 0.9) / 0.85) * 150
  const done = t >= 9

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      <line x1={46} y1={186} x2={384} y2={186} stroke={WHITE} strokeOpacity={0.5} />
      <line x1={46} y1={30} x2={46} y2={186} stroke={WHITE} strokeOpacity={0.5} />
      <line x1={46} y1={py(BASEL_LIMIT)} x2={384} y2={py(BASEL_LIMIT)} stroke={YELLOW} strokeDasharray="5 4" />
      <text x={382} y={py(BASEL_LIMIT) - 6} textAnchor="end" fontSize={12} fontWeight={700} fill={YELLOW}>
        π²/6 = 1.6449…
      </text>
      <text x={40} y={py(1) + 4} textAnchor="end" fontSize={11} fill={WHITE} fillOpacity={0.7}>1</text>
      <text x={40} y={py(1.5) + 4} textAnchor="end" fontSize={11} fill={WHITE} fillOpacity={0.7}>1.5</text>
      {[10, 20, 30, 40].map((k) => (
        <text key={k} x={px(k)} y={200} textAnchor="middle" fontSize={10} fill={WHITE} fillOpacity={0.6}>
          {k}항
        </text>
      ))}

      {BASEL.slice(1, n + 1).map((v, i) => (
        <g key={i}>
          <line x1={px(i + 1)} y1={186} x2={px(i + 1)} y2={py(v)} stroke={WHITE} strokeOpacity={0.18} strokeWidth={5} />
          <circle cx={px(i + 1)} cy={py(v)} r={3} fill={WHITE} />
        </g>
      ))}

      <text x={200} y={22} textAnchor="middle" fontSize={14} fontWeight={700} fill={WHITE}>
        1 + 1/4 + 1/9 + … + 1/{n}² = {BASEL[n].toFixed(4)}
      </text>
      <Caption>{done ? '제곱수의 역수의 합에서 π 가 나타난다' : '항을 더할수록 어떤 값에 다가간다'}</Caption>
    </svg>
  )
}

// ── 0.999… = 1 : 9 를 붙일수록 1 과의 틈이 사라짐 ─────────────────────────────
function PointNine() {
  const { ref, t } = useLoop(12)
  const digits = Math.max(1, Math.min(7, Math.floor(1 + ramp(t, 0.5, 8) * 6.99)))
  const value = '0.' + '9'.repeat(digits)
  const gap = '0.' + '0'.repeat(digits - 1) + '1'
  const filled = 1 - Math.pow(10, -digits)
  const done = t >= 9

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      <text x={200} y={52} textAnchor="middle" fontSize={34} fontWeight={800} fill={done ? YELLOW : WHITE}>
        {done ? '0.999… = 1' : value}
      </text>

      {/* 0 부터 1 까지의 막대 */}
      <rect x={40} y={86} width={320} height={34} rx={6} fill={RED} fillOpacity={0.9} />
      <rect x={40} y={86} width={320 * (done ? 1 : filled)} height={34} rx={6} fill={GREEN} />
      <text x={40} y={138} textAnchor="middle" fontSize={12} fill={WHITE} fillOpacity={0.8}>0</text>
      <text x={360} y={138} textAnchor="middle" fontSize={12} fill={WHITE} fillOpacity={0.8}>1</text>

      <text x={200} y={172} textAnchor="middle" fontSize={16} fontWeight={700} fill={WHITE} opacity={done ? 0 : 1}>
        1 과의 차이 = {gap}
      </text>
      <text x={200} y={172} textAnchor="middle" fontSize={15} fontWeight={700} fill={WHITE} opacity={done ? 1 : 0}>
        둘 사이에 들어갈 수가 하나도 없다
      </text>
      <text x={200} y={196} textAnchor="middle" fontSize={12} fill={WHITE} fillOpacity={0.7} opacity={digits >= 3 && !done ? 1 : 0}>
        (빨간 틈이 더는 보이지 않는다)
      </text>

      <Caption>{done ? '같은 수를 나타내는 두 가지 표기' : '9 를 하나 붙일 때마다 틈은 1/10 로'}</Caption>
    </svg>
  )
}

// ── 4색 정리: 이웃한 영역은 다른 색으로 ───────────────────────────────────────
const MAP_COLORS = ['#f87171', '#60a5fa', '#facc15', '#4ade80']
// [꼭짓점들, 색 번호] — 변을 공유하는 영역끼리는 색이 다르도록 미리 배정
const MAP_REGIONS: [string, number][] = [
  ['150,84 260,76 240,142 140,142', 0],
  ['170,20 280,20 260,76 150,84', 1],
  ['50,94 150,84 140,142 120,184 50,184', 2],
  ['140,142 240,142 260,184 120,184', 1],
  ['260,76 350,104 350,184 260,184 240,142', 2],
  ['280,20 350,20 350,104 260,76', 3],
  ['50,20 170,20 150,84 50,94', 0],
]

function FourColor() {
  const { ref, t } = useLoop(12)
  const painted = MAP_REGIONS.map((_, i) => ramp(t, 0.8 + i * 1.0, 1.4 + i * 1.0))
  const used = new Set(MAP_REGIONS.filter((_, i) => painted[i] > 0).map(([, c]) => c)).size
  const done = t >= 8.6

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      {MAP_REGIONS.map(([points, color], i) => (
        <polygon key={i} points={points} fill={MAP_COLORS[color]} fillOpacity={0.12 + 0.78 * painted[i]} stroke={WHITE} strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      {MAP_COLORS.map((c, i) => (
        <rect key={c} x={364} y={30 + i * 26} width={18} height={18} rx={4} fill={c} fillOpacity={i < used ? 1 : 0.15} stroke={WHITE} strokeOpacity={0.6} />
      ))}
      <text x={373} y={150} textAnchor="middle" fontSize={11} fill={WHITE} fillOpacity={0.8}>
        {used}색
      </text>
      <Caption>{done ? '어떤 지도든 4색이면 충분 (1976년 컴퓨터로 증명)' : '이웃한 나라는 서로 다른 색으로'}</Caption>
    </svg>
  )
}

// ── 페르마의 마지막 정리: n=2 는 되는데 n≥3 은 안 된다 ────────────────────────
function DotSquare({ x, y, n, opacity, color }: { x: number; y: number; n: number; opacity: number; color: string }) {
  const cells = []
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push(<rect key={`${i}-${j}`} x={x + i * 13} y={y + j * 13} width={11} height={11} rx={2} fill={color} />)
  return <g opacity={opacity}>{cells}</g>
}

function Fermat() {
  const { ref, t } = useLoop(12)
  const phase2 = ramp(t, 4.6, 5.2)

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      <g opacity={1 - phase2}>
        <DotSquare x={40} y={62} n={3} opacity={ramp(t, 0.4, 0.9)} color={SKY} />
        <DotSquare x={124} y={49} n={4} opacity={ramp(t, 1.2, 1.7)} color={GREEN} />
        <DotSquare x={240} y={36} n={5} opacity={ramp(t, 2.2, 2.7)} color={YELLOW} />
        <text x={102} y={86} textAnchor="middle" fontSize={22} fontWeight={800} fill={WHITE} opacity={ramp(t, 1.2, 1.7)}>+</text>
        <text x={208} y={86} textAnchor="middle" fontSize={22} fontWeight={800} fill={WHITE} opacity={ramp(t, 2.2, 2.7)}>=</text>
        <text x={200} y={148} textAnchor="middle" fontSize={22} fontWeight={800} fill={WHITE} opacity={ramp(t, 2.8, 3.4)}>
          3² + 4² = 5²
        </text>
        <text x={200} y={176} textAnchor="middle" fontSize={15} fontWeight={700} fill={GREEN} opacity={ramp(t, 3.2, 3.8)}>
          9 + 16 = 25 ✓ (n = 2 는 해가 무한히 많다)
        </text>
      </g>

      <g opacity={phase2}>
        <text x={200} y={46} textAnchor="middle" fontSize={17} fontWeight={700} fill={WHITE}>
          그렇다면 세제곱(n = 3)은?
        </text>
        <text x={200} y={88} textAnchor="middle" fontSize={20} fontWeight={800} fill={WHITE} opacity={ramp(t, 5.6, 6.2)}>
          3³ + 4³ = 91 ≠ 5³ = 125
        </text>
        <text x={200} y={126} textAnchor="middle" fontSize={20} fontWeight={800} fill={WHITE} opacity={ramp(t, 7, 7.6)}>
          6³ + 8³ = 728 ≠ 9³ = 729
        </text>
        <text x={200} y={150} textAnchor="middle" fontSize={13} fontWeight={700} fill={RED} opacity={ramp(t, 7.6, 8.2)}>
          딱 1 차이 — 아깝지만 실패 ✗
        </text>
        <text x={200} y={190} textAnchor="middle" fontSize={19} fontWeight={800} fill={YELLOW} opacity={ramp(t, 9, 9.7)}>
          xⁿ + yⁿ = zⁿ (n ≥ 3) 의 자연수 해는 없다
        </text>
      </g>

      <Caption>{t < 4.6 ? '피타고라스 수: 제곱에서는 가능' : t < 9 ? '세제곱부터는 아무리 찾아도…' : '358년 만에 와일스가 증명 (1995)'}</Caption>
    </svg>
  )
}

// ── 택시 수 1729: 두 가지 세제곱 합 ───────────────────────────────────────────
function Taxicab() {
  const { ref, t } = useLoop(12)
  const unit = 300 / 1729
  const row1 = ramp(t, 1.2, 3.2)
  const row2 = ramp(t, 4.6, 6.6)
  const done = t >= 8

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      <text x={200} y={40} textAnchor="middle" fontSize={34} fontWeight={800} fill={done ? YELLOW : WHITE}>
        1729
      </text>

      {/* 1³ + 12³ */}
      <g opacity={ramp(t, 1, 1.4)}>
        <rect x={50} y={62} width={Math.max(2, 1 * unit)} height={30} fill={SKY} />
        <rect x={50 + 1 * unit + 2} y={62} width={1728 * unit * row1} height={30} rx={3} fill={GREEN} />
        <text x={200} y={110} textAnchor="middle" fontSize={15} fontWeight={700} fill={WHITE}>
          1³ + 12³ = 1 + {Math.round(1728 * row1)}
        </text>
      </g>

      {/* 9³ + 10³ */}
      <g opacity={ramp(t, 4.4, 4.8)}>
        <rect x={50} y={128} width={729 * unit * row2} height={30} rx={3} fill={SKY} />
        <rect x={50 + 729 * unit + 2} y={128} width={1000 * unit * row2} height={30} rx={3} fill={GREEN} />
        <text x={200} y={176} textAnchor="middle" fontSize={15} fontWeight={700} fill={WHITE}>
          9³ + 10³ = {Math.round(729 * row2)} + {Math.round(1000 * row2)}
        </text>
      </g>

      <text x={200} y={200} textAnchor="middle" fontSize={13} fontWeight={700} fill={YELLOW} opacity={ramp(t, 8, 8.8)}>
        두 막대의 길이가 똑같다 — 둘 다 1729
      </text>
      <Caption>{done ? '세제곱수 두 개의 합으로 두 가지인 가장 작은 수' : '라마누잔: "아주 흥미로운 수입니다"'}</Caption>
    </svg>
  )
}

// ── 벤포드 법칙: 첫 자리 숫자의 분포 ──────────────────────────────────────────
const BENFORD = Array.from({ length: 9 }, (_, i) => Math.log10(1 + 1 / (i + 1)))

function Benford() {
  const { ref, t } = useLoop(12)
  const bh = (p: number) => p * 460
  const uniform = ramp(t, 7.4, 8.2)

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      <line x1={30} y1={186} x2={380} y2={186} stroke={WHITE} strokeOpacity={0.5} />
      {BENFORD.map((p, i) => {
        const grow = ramp(t, 0.6 + i * 0.6, 1.2 + i * 0.6)
        const x = 40 + i * 37
        return (
          <g key={i}>
            <rect x={x} y={186 - bh(p) * grow} width={28} height={bh(p) * grow} rx={3} fill={i === 0 ? YELLOW : WHITE} fillOpacity={i === 0 ? 1 : 0.75} />
            <text x={x + 14} y={202} textAnchor="middle" fontSize={13} fontWeight={700} fill={WHITE}>
              {i + 1}
            </text>
            <text x={x + 14} y={180 - bh(p) * grow} textAnchor="middle" fontSize={10} fontWeight={700} fill={i === 0 ? YELLOW : WHITE} opacity={grow}>
              {(p * 100).toFixed(1)}
            </text>
          </g>
        )
      })}
      <g opacity={uniform}>
        <line x1={30} y1={186 - bh(1 / 9)} x2={380} y2={186 - bh(1 / 9)} stroke={RED} strokeDasharray="5 4" strokeWidth={2} />
        <text x={378} y={180 - bh(1 / 9)} textAnchor="end" fontSize={11} fontWeight={700} fill={RED}>
          공평하다면 11.1%
        </text>
      </g>
      <text x={372} y={40} textAnchor="end" fontSize={13} fontWeight={700} fill={WHITE} fillOpacity={0.85}>
        P(d) = log₁₀(1 + 1/d)
      </text>
      <Caption>{t < 7.4 ? '실제 데이터의 첫 자리 숫자 비율(%)' : '1로 시작하는 수가 30% — 조작 탐지에 쓰인다'}</Caption>
    </svg>
  )
}

// ── 필즈상: 1936년부터 4년마다 ────────────────────────────────────────────────
const FIELDS_YEARS = [1936, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022]

function FieldsMedal() {
  const { ref, t } = useLoop(12)
  const year = 1936 + (2022 - 1936) * ramp(t, 1, 8)
  const px = (y: number) => 36 + ((y - 1936) / (2022 - 1936)) * 328
  const done = t >= 8
  const caption =
    t < 2
      ? '1936년, 첫 필즈상 수여'
      : t < 3.6
      ? '전쟁으로 중단 → 1950년 재개'
      : t < 8
      ? '4년마다, 만 40세 미만 수학자에게'
      : '2022년 허준이 교수 — 한국계 최초 수상'

  return (
    <svg ref={ref} viewBox="0 0 400 240" className="h-full w-full">
      {/* 메달 */}
      <circle cx={200} cy={66} r={40} fill="#fbbf24" stroke="#fef3c7" strokeWidth={3} />
      <circle cx={200} cy={66} r={31} fill="none" stroke="#92400e" strokeOpacity={0.5} strokeWidth={1.5} />
      <text x={200} y={61} textAnchor="middle" fontSize={11} fontWeight={800} fill="#78350f">
        FIELDS
      </text>
      <text x={200} y={82} textAnchor="middle" fontSize={17} fontWeight={800} fill="#78350f">
        {Math.round(year)}
      </text>

      {/* 연표 */}
      <line x1={36} y1={160} x2={364} y2={160} stroke={WHITE} strokeOpacity={0.4} strokeWidth={2} />
      <line x1={36} y1={160} x2={px(year)} y2={160} stroke={YELLOW} strokeWidth={3} />
      {FIELDS_YEARS.map((y) => {
        const reached = year >= y
        const last = y === 2022 && done
        return <circle key={y} cx={px(y)} cy={160} r={last ? 8 : 4.5} fill={reached ? YELLOW : '#1e1b4b'} stroke={WHITE} strokeOpacity={0.7} strokeWidth={1.5} />
      })}
      <text x={px(1936)} y={184} textAnchor="middle" fontSize={11} fill={WHITE} fillOpacity={0.8}>1936</text>
      <text x={px(1950)} y={184} textAnchor="middle" fontSize={11} fill={WHITE} fillOpacity={0.8}>1950</text>
      <text x={px(1990)} y={184} textAnchor="middle" fontSize={11} fill={WHITE} fillOpacity={0.8}>1990</text>
      <text x={px(2022) - 6} y={184} textAnchor="middle" fontSize={12} fontWeight={800} fill={done ? YELLOW : WHITE} fillOpacity={done ? 1 : 0.8}>2022</text>
      <text x={px(1943)} y={146} textAnchor="middle" fontSize={10} fill={RED} opacity={ramp(t, 2, 2.5) * (1 - ramp(t, 4.5, 5))}>
        중단
      </text>
      <text x={px(2022) - 6} y={140} textAnchor="middle" fontSize={13} fontWeight={800} fill={YELLOW} opacity={ramp(t, 8.2, 9)}>
        허준이
      </text>

      <Caption>{caption}</Caption>
    </svg>
  )
}

export const MORE_VISUALS: Record<string, () => JSX.Element> = {
  'topic-euler-identity': EulerIdentity,
  'topic-monty-hall': MontyHall,
  'topic-basel': Basel,
  'topic-0999': PointNine,
  'topic-four-color': FourColor,
  'topic-fermat': Fermat,
  'topic-1729': Taxicab,
  'topic-benford': Benford,
  'topic-fields-medal': FieldsMedal,
}
