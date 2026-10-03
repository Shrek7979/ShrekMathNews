import React, { useEffect, useRef, useState } from 'react'

// 수학 주제 애니메이션들이 함께 쓰는 도구: 색, 진행률 함수, 반복 시계, 자막

export const YELLOW = '#fde047'
export const WHITE = '#ffffff'

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
// t 가 a→b 로 갈 때 0→1 로 변하는 진행률
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))

// 카드가 화면에 보이는 동안만 0 → duration 을 반복해서 흐르는 시계
export function useLoop(duration: number) {
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

export function Caption({ children }: { children: React.ReactNode }) {
  return (
    <text x={200} y={228} textAnchor="middle" fontSize={15} fontWeight={700} fill={WHITE}>
      {children}
    </text>
  )
}
