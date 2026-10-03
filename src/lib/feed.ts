import { useCallback, useEffect, useState } from 'react'

export type FeedItem = {
  id: string
  kind: 'news' | 'video'
  lang: 'ko' | 'en'
  title: string
  summary: string
  link: string
  source: string
  image?: string
  category: string
  publishedAt: string
  collectedAt: string
  views?: number
  thumb?: string | null
  titleKo?: string
  summaryKo?: string
  translator?: 'claude' | 'mymemory'
  // 날짜가 의미 없는 고정 카드 (인스타·페이스북 바로가기 등)
  evergreen?: boolean
}

export type Feed = { updatedAt: string | null; items: FeedItem[] }

// data/social.json — 자동 수집이 불가능한 인스타그램·페이스북은 직접 고른 바로가기로 제공
export type SocialLink = {
  id: string
  platform: 'Instagram' | 'Facebook'
  label: string
  title: string
  summary: string
  link: string
}

export type Topic = {
  id: string
  tag: string
  title: string
  slides: { heading: string; body: string }[]
}

export const SITE_NAME = 'Shrek Math News'
export const TOPIC_CATEGORY = '수학'
export const CATEGORY_ORDER = ['인기', '교육', '입시', 'AI·에듀테크', '연구', '대회·행사', '해외', '영상']

// 카테고리별 카드 배경 (Tailwind 가 인식하도록 전체 클래스명을 그대로 적음)
export const CATEGORY_STYLE: Record<string, string> = {
  교육: 'from-sky-600 to-indigo-950',
  입시: 'from-rose-600 to-purple-950',
  'AI·에듀테크': 'from-emerald-600 to-teal-950',
  연구: 'from-violet-600 to-slate-950',
  '대회·행사': 'from-amber-600 to-orange-950',
  해외: 'from-cyan-600 to-blue-950',
  영상: 'from-neutral-700 to-neutral-950',
  인기: 'from-orange-500 to-rose-950',
  [TOPIC_CATEGORY]: 'from-fuchsia-600 to-indigo-950',
}

const SYMBOLS = ['∑', 'π', '∫', '∞', '√', 'Δ', 'θ', '∂', 'φ', '≡']
export const symbolFor = (id: string) =>
  SYMBOLS[id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % SYMBOLS.length]

const KST = 'Asia/Seoul'
const dateFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: KST, month: 'numeric', day: 'numeric', weekday: 'short' })
const shortDateFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: KST, month: 'numeric', day: 'numeric' })
const hourFormat = new Intl.DateTimeFormat('en-US', { timeZone: KST, hour: 'numeric', hourCycle: 'h23' })

export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

// "10. 2. 오후판" — 하루 2번 수집되는 판 이름
export function editionLabel(iso: string) {
  const edition = Number(hourFormat.format(new Date(iso))) < 12 ? '오전판' : '오후판'
  return `${shortDateFormat.format(new Date(iso))} ${edition}`
}

// 조회수를 '12.3만' 처럼 짧게
export function formatViews(views: number) {
  if (views >= 100_000_000) return `${(views / 100_000_000).toFixed(1)}억`
  if (views >= 10_000) return `${(views / 10_000).toFixed(views >= 1_000_000 ? 0 : 1)}만`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}천`
  return String(views)
}

export function timeAgo(iso: string, now: number) {
  const minutes = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}시간 전`
  return `${Math.round(minutes / (60 * 24))}일 전`
}

// localStorage 에 보관되는 id 집합 (저장한 카드, 읽은 카드)
export function useStoredSet(key: string) {
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      setIds(new Set(JSON.parse(localStorage.getItem(key) || '[]')))
    } catch {}
  }, [key])

  const update = useCallback(
    (change: (next: Set<string>) => void) =>
      setIds((prev) => {
        const next = new Set(prev)
        change(next)
        try {
          localStorage.setItem(key, JSON.stringify(Array.from(next).slice(-500)))
        } catch {}
        return next
      }),
    [key]
  )

  const add = useCallback((id: string) => update((next) => next.add(id)), [update])
  const toggle = useCallback(
    (id: string) => update((next) => (next.has(id) ? next.delete(id) : next.add(id))),
    [update]
  )

  return { ids, add, toggle }
}

export async function shareLink(title: string, url: string): Promise<string | null> {
  try {
    if (navigator.share) {
      await navigator.share({ title, url })
      return null
    }
    await navigator.clipboard.writeText(url)
    return '링크를 복사했어요'
  } catch {
    return null
  }
}
