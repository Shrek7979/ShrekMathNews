import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { GetStaticProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import Briefing from '@/components/feed/Briefing'
import { EndCard, NewsCard, TopicCard } from '@/components/feed/ReelCard'
import {
  CATEGORY_ORDER,
  Feed,
  FeedItem,
  SITE_NAME,
  SocialLink,
  TOPIC_CATEGORY,
  LEVELS,
  Topic,
  editionLabel,
  matchesLevel,
  popularity,
  shareLink,
  useStoredSet,
} from '@/lib/feed'

type Props = { feed: Feed; topics: Topic[]; dayIndex: number }
type Card = { key: string; item?: FeedItem; topic?: Topic }

const ALL = '전체'
const SAVED = '★ 저장'
const TOPIC_EVERY = 5
const AUTO_SECONDS = 8
const LOCAL_COLLECT_URL = 'http://localhost:3001/collect'
// 공유 미리보기 이미지는 절대 주소여야 함. 배포 워크플로가 NEXT_PUBLIC_SITE_URL 을 넣어 줌
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

// 빌드(배포) 시점의 data/feed.json 을 읽음. 로컬 개발 서버에서는 요청마다 다시 읽음
export const getStaticProps: GetStaticProps<Props> = async () => {
  const read = async <T,>(file: string, fallback: T): Promise<T> => {
    try {
      return JSON.parse(await readFile(path.join(process.cwd(), 'data', file), 'utf8'))
    } catch {
      return fallback
    }
  }
  const feed = await read<Feed>('feed.json', { updatedAt: null, items: [] })
  // 인스타그램·페이스북 바로가기는 '인기' 카드로 뒤에 붙임
  const social = (await read<SocialLink[]>('social.json', [])).map<FeedItem>((s) => ({
    id: s.id,
    kind: 'news',
    lang: 'ko',
    title: s.title,
    summary: s.summary,
    link: s.link,
    source: s.platform,
    category: '인기',
    publishedAt: '2000-01-01T00:00:00.000Z',
    collectedAt: '2000-01-01T00:00:00.000Z',
    // 실제 화면 캡처(<id>.cap.jpg)가 있으면 그것을, 없으면 글자 섬네일(<id>.jpg)을 사용
    thumb: existsSync(path.join(process.cwd(), 'public/social', `${s.id}.cap.jpg`)) ? `/social/${s.id}.cap.jpg` : `/social/${s.id}.jpg`,
    evergreen: true,
  }))
  // 인스타그램·페이스북 게시물도 뉴스와 같은 규칙으로 섞음: 새로 가져온 것이 앞
  const posts: FeedItem[] = []
  for (const file of ['instagram.json', 'facebook.json']) {
    const { items } = await read<{ items: FeedItem[] }>(file, { items: [] })
    posts.push(...items.map((item) => ({ ...item, collectedAt: item.collectedAt || item.publishedAt })))
  }
  // 중복 제거: 같은 영상·같은 제목이 유튜브 카드로 이미 있으면 인스타그램·페이스북 쪽을 뺌
  // (예: 3Blue1Brown 쇼츠와 같은 영상의 인스타 릴스, 새 영상을 알리는 페이스북 글)
  const normalize = (text?: string) => (text || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '')
  const seenTitles = new Set(feed.items.flatMap((item) => [normalize(item.title), normalize(item.titleKo)]).filter((t) => t.length >= 6))
  const videoIds = new Set(
    feed.items.map((item) => item.link.match(/(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/)?.[1]).filter(Boolean)
  )
  const uniquePosts = posts.filter((post) => {
    const titles = [normalize(post.title), normalize(post.titleKo)].filter((t) => t.length >= 6)
    if (titles.some((t) => seenTitles.has(t)) || post.refs?.some((id) => videoIds.has(id))) return false
    titles.forEach((t) => seenTitles.add(t))
    return true
  })
  // 섬네일 파일이 이번 배포에 없으면(다른 컴퓨터에서 수집된 경우 등) 깨진 그림 대신 원문 이미지를 보여 줌
  const withThumb = (item: FeedItem): FeedItem => {
    if (!item.thumb?.startsWith('/') || existsSync(path.join(process.cwd(), 'public', item.thumb))) return item
    const videoId = item.link.match(/(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/)?.[1]
    const fallback = item.image || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null)
    return { ...item, thumb: fallback }
  }
  const dated = [...feed.items, ...uniquePosts].map(withThumb).sort(
    (a, b) => b.collectedAt.localeCompare(a.collectedAt) || b.publishedAt.localeCompare(a.publishedAt)
  )
  return {
    props: {
      feed: { ...feed, items: [...dated, ...social] },
      topics: await read<Topic[]>('topics.json', []),
      dayIndex: Math.floor(Date.now() / (24 * 60 * 60 * 1000)),
    },
  }
}

export default function ReelsPage({ feed, topics, dayIndex }: Props) {
  const router = useRouter()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<'reels' | 'briefing'>('reels')
  const [category, setCategory] = useState(ALL)
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(false)
  // 인스타 릴스처럼: 아래로 넘기기 시작하면 상단 메뉴를 숨겨 카드가 화면을 꽉 채움
  const [immersive, setImmersive] = useState(false)
  const [toast, setToast] = useState('')
  // 검색·학교급 필터 (돋보기 버튼으로 여닫음)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [isLocal, setIsLocal] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const saved = useStoredSet('math-hub:saved')
  const read = useStoredSet('math-hub:read')

  useEffect(() => {
    setNow(Date.now())
    setIsLocal(window.location.hostname === 'localhost')
    try {
      const last = localStorage.getItem('math-hub:view')
      if (last === 'briefing') setView('briefing')
      const lastLevel = localStorage.getItem('math-hub:level')
      if (lastLevel) {
        setLevel(lastLevel)
        setSearchOpen(true)
      }
    } catch {}
  }, [feed.updatedAt])

  const switchView = (next: 'reels' | 'briefing') => {
    setView(next)
    try {
      localStorage.setItem('math-hub:view', next)
    } catch {}
  }

  // 주제 카드는 날마다 다른 것부터 시작
  const rotatedTopics = useMemo(
    () => topics.map((_, i) => topics[(i + dayIndex) % topics.length]),
    [topics, dayIndex]
  )
  const latestBatch = useMemo(
    () => feed.items.reduce<string | null>((max, i) => (!max || i.collectedAt > max ? i.collectedAt : max), null),
    [feed.items]
  )

  const keyword = query.trim().toLowerCase()
  const visibleItems = useMemo(() => {
    const inLevel = feed.items.filter((item) => matchesLevel(item, level))
    // 검색어가 있으면 카테고리와 상관없이 전체에서 찾음
    if (keyword) {
      return inLevel.filter((item) =>
        `${item.title} ${item.titleKo || ''} ${item.summary} ${item.summaryKo || ''} ${item.detail || ''} ${item.detailKo || ''} ${item.source}`.toLowerCase().includes(keyword)
      )
    }
    if (category === ALL) return inLevel
    if (category === SAVED) return inLevel.filter((item) => saved.ids.has(item.id))
    // 인기: 카테고리와 상관없이 조회수·좋아요가 있는 카드 전부를 많은 순으로 (숫자가 없는 SNS 카드는 뒤로)
    if (category === '인기') {
      return inLevel
        .filter((item) => item.category === '인기' || popularity(item) > 0)
        .sort((a, b) => popularity(b) - popularity(a))
    }
    return inLevel.filter((item) => item.category === category)
  }, [feed.items, category, saved.ids, keyword, level])

  const cards = useMemo<Card[]>(() => {
    const newsCards: Card[] = visibleItems.map((item) => ({ key: item.id, item }))
    if (keyword) {
      const found = rotatedTopics.filter((topic) =>
        `${topic.title} ${topic.tag} ${topic.slides.map((s) => `${s.heading} ${s.body}`).join(' ')}`.toLowerCase().includes(keyword)
      )
      return [...found.map((topic) => ({ key: topic.id, topic })), ...newsCards]
    }
    if (category === TOPIC_CATEGORY) return rotatedTopics.map((topic) => ({ key: topic.id, topic }))
    if (category === SAVED) {
      const savedTopics = rotatedTopics.filter((topic) => saved.ids.has(topic.id))
      return [...newsCards, ...savedTopics.map((topic) => ({ key: topic.id, topic }))]
    }
    if (category !== ALL) return newsCards
    // 전체 보기에서는 뉴스 5장마다 주제 카드를 한 장씩 끼워 넣음
    const mixed: Card[] = []
    newsCards.forEach((card, i) => {
      mixed.push(card)
      const topic = rotatedTopics[Math.floor(i / TOPIC_EVERY)]
      if ((i + 1) % TOPIC_EVERY === 0 && topic) mixed.push({ key: topic.id, topic })
    })
    return mixed
    // 저장 목록은 탭을 바꿀 때만 다시 계산해, 저장 해제 시 카드가 바로 사라지지 않게 함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, rotatedTopics, category, keyword])

  const categories = useMemo(() => {
    const present = CATEGORY_ORDER.filter((c) => feed.items.some((item) => item.category === c))
    const popular = present.filter((c) => c === '인기')
    const rest = present.filter((c) => c !== '인기')
    // 전체 · 인기 · 수학 · 문제·증명 · … (문제·증명은 수학 주제 바로 뒤)
    return [ALL, ...popular, TOPIC_CATEGORY, ...rest, SAVED]
  }, [feed.items])

  // 부드러운 스크롤이 끝나기 전에 키를 연달아 눌러도 밀리지 않도록 목표 위치를 따로 기억
  const target = useRef(0)
  const settled = useRef(0) // 마지막으로 멈춰 선 카드 번호
  const settleTimer = useRef<ReturnType<typeof setTimeout>>()
  const goTo = useCallback((index: number, smooth = true) => {
    const el = scrollerRef.current
    if (!el) return
    target.current = Math.max(0, Math.min(index, el.children.length - 1))
    el.scrollTo({ top: el.clientHeight * target.current, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const index = Math.round(el.scrollTop / el.clientHeight)
    setActive(index)
    // 손가락/휠로 직접 넘긴 경우: 스크롤이 카드 경계에 멈추면 목표도 따라감
    if (Math.abs(el.scrollTop - el.clientHeight * index) < 2) target.current = index
    // 스크롤이 완전히 멈춘 뒤에만 전체화면을 켜고 끔: 아래로 넘기면 켜지고, 위로 올리거나 첫 카드면 꺼짐
    // (움직이는 도중에 메뉴를 숨기면 카드 높이가 바뀌어 스크롤이 튐)
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const stopped = Math.round(el.scrollTop / el.clientHeight)
      if (stopped === settled.current) return
      setImmersive(stopped > settled.current && stopped > 0)
      settled.current = stopped
    }, 180)
  }

  // 메뉴가 사라지거나 나타나면 카드 높이가 바뀌므로, 화면에 그리기 전에 스크롤 위치를 다시 맞춤
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTo({ top: el.clientHeight * settled.current, behavior: 'auto' })
  }, [immersive])

  // 마우스 휠/트랙패드: 한 번 굴리면 정확히 카드 한 장만 이동 (브라우저 기본 동작은 조금씩 밀려 여러 번 굴려야 함)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || view !== 'reels') return
    let lockedUntil = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return
      e.preventDefault()
      const now = Date.now()
      if (now < lockedUntil) return
      lockedUntil = now + 800
      goTo(target.current + (e.deltaY > 0 ? 1 : -1))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [view, goTo])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 2500)
  }

  const selectLevel = (next: string) => {
    setLevel(next)
    try {
      localStorage.setItem('math-hub:level', next)
    } catch {}
  }

  // 검색어·학교급이 바뀌면 목록이 달라지므로 첫 카드로 돌아감
  useEffect(() => {
    setActive(0)
    setImmersive(false)
    settled.current = 0
    goTo(0, false)
  }, [keyword, level, goTo])

  const selectCategory = (next: string) => {
    setQuery('')
    setCategory(next)
    setActive(0)
    setImmersive(false)
    settled.current = 0
    goTo(0, false)
  }

  const openTopic = () => {
    switchView('reels')
    selectCategory(TOPIC_CATEGORY)
  }

  // 지금 보고 있는 카드를 읽음 처리
  const activeKey = view === 'reels' ? cards[active]?.item?.id : undefined
  const markRead = read.add
  useEffect(() => {
    if (activeKey) markRead(activeKey)
  }, [activeKey, markRead])

  // 자동 넘김
  useEffect(() => {
    if (!auto || view !== 'reels') return
    if (active >= cards.length) return setAuto(false)
    const timer = setTimeout(() => goTo(active + 1), AUTO_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [auto, view, active, cards.length, goTo])

  // 키보드: ↑↓ 또는 j/k 로 이동, 스페이스로 자동 넘김
  useEffect(() => {
    if (view !== 'reels') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') goTo(target.current + 1)
      else if (e.key === 'ArrowUp' || e.key === 'k') goTo(target.current - 1)
      else if (e.key === ' ') setAuto((on) => !on)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, goTo])

  // 로컬에서만: npm run local 이 띄운 수집 엔드포인트를 호출해 지금 수집
  const refresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(LOCAL_COLLECT_URL, { method: 'POST' })
      const data = await res.json()
      showToast(res.ok ? `새 카드 ${data.added}건을 가져왔어요` : data.error)
      if (res.ok) await router.replace(router.asPath, undefined, { scroll: false })
    } catch {
      showToast('수집에 실패했어요 (npm run local 로 실행했는지 확인)')
    }
    setRefreshing(false)
  }

  const fullscreen = immersive && view === 'reels'
  const unreadCount = feed.items.filter((item) => !item.evergreen && !read.ids.has(item.id)).length
  const edition = feed.updatedAt ? editionLabel(feed.updatedAt) : '아직 수집 전'

  return (
    <>
      <Head>
        <title>{SITE_NAME}</title>
        <meta name="description" content="수학 교사를 위한 수학 뉴스·영상·수업 주제, 1시간마다 업데이트" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        {/* 카톡·슬랙·페북 등에 링크를 올렸을 때 보이는 미리보기 */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={SITE_NAME} />
        <meta property="og:description" content="수학 교사를 위한 수학 뉴스·영상·수업 주제, 1시간마다 업데이트" />
        <meta property="og:image" content={`${SITE_URL}/og.jpg`} />
        <meta property="og:image:secure_url" content={`${SITE_URL}/og.jpg`} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Shrek Math News — 수학 교사를 위한 수학 뉴스 릴스" />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_NAME} />
        <meta name="twitter:description" content="수학 교사를 위한 수학 뉴스·영상·수업 주제, 1시간마다 업데이트" />
        <meta name="twitter:image" content={`${SITE_URL}/og.jpg`} />
        <link rel="manifest" href={`${router.basePath}/manifest.json`} />
        <link rel="icon" href={`${router.basePath}/icon-180.png`} type="image/png" />
        <link rel="apple-touch-icon" href={`${router.basePath}/icon-180.png`} />
      </Head>

      <div className="fixed inset-0 flex flex-col bg-neutral-950 text-white [padding-top:env(safe-area-inset-top)]">
        <header className={`mx-auto w-full max-w-2xl shrink-0 px-4 pt-2 ${fullscreen ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-extrabold leading-tight">
                <span className="text-emerald-400">Shrek</span> Math News
              </h1>
              <p className="truncate text-[11px] text-white/60">
                {edition}
                {feed.updatedAt && ` · 안 읽음 ${unreadCount}`}
              </p>
            </div>
            <div className="flex rounded-full bg-white/10 p-0.5 text-[13px] font-bold">
              {(['reels', 'briefing'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => switchView(v)}
                  className={`min-h-[36px] rounded-full px-3 transition ${
                    view === v ? 'bg-white text-neutral-900' : 'text-white/70'
                  }`}
                >
                  {v === 'reels' ? '릴스' : '한눈에'}
                </button>
              ))}
            </div>
            {isLocal && (
              <button
                onClick={refresh}
                disabled={refreshing}
                title="지금 새 소식 수집"
                aria-label="지금 새 소식 수집"
                className="min-h-[36px] min-w-[36px] rounded-full bg-white/10 text-sm font-bold hover:bg-white/20 disabled:opacity-50"
              >
                <span className={refreshing ? 'inline-block animate-spin' : ''}>↻</span>
              </button>
            )}
            <button
              onClick={() => setSearchOpen((open) => !open)}
              aria-label="검색·학교급"
              aria-pressed={searchOpen}
              className={`min-h-[36px] rounded-full px-3 text-[13px] font-bold ${
                searchOpen || keyword || level ? 'bg-white text-neutral-900' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              검색
            </button>
          </div>

          {searchOpen && (
            <div className="mt-2 flex items-center gap-1.5">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목·출처 검색"
                aria-label="검색어"
                className="min-h-[36px] min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[14px] text-white placeholder-white/40 outline-none focus:bg-white/15"
              />
              {['', ...LEVELS].map((l) => (
                <button
                  key={l}
                  onClick={() => selectLevel(l)}
                  aria-pressed={level === l}
                  className={`min-h-[36px] shrink-0 rounded-full px-2.5 text-[13px] font-bold ${
                    level === l ? 'bg-white text-neutral-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {l || '모두'}
                </button>
              ))}
            </div>
          )}

          <nav className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => selectCategory(c)}
                className={`min-h-[34px] shrink-0 rounded-full px-3.5 text-[13px] font-bold transition ${
                  category === c && !keyword ? 'bg-white text-neutral-900' : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {c}
              </button>
            ))}
          </nav>
        </header>

        <main className="relative min-h-0 flex-1">
          {view === 'briefing' ? (
            <Briefing
              items={category === TOPIC_CATEGORY && !keyword ? [] : visibleItems}
              topic={rotatedTopics[0]}
              latestBatch={latestBatch}
              now={now}
              savedIds={saved.ids}
              readIds={read.ids}
              onSave={saved.toggle}
              onRead={read.add}
              onOpenTopic={openTopic}
            />
          ) : (
            <div className="relative mx-auto flex h-full max-h-[900px] w-full max-w-[460px] flex-col pb-[env(safe-area-inset-bottom)]">
              {/* 전체화면일 때: 얇은 진행 선과 메뉴 다시 열기 버튼만 카드 위에 겹쳐 보여 줌 */}
              {fullscreen && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 bg-white/20">
                    <div
                      className="h-full bg-white transition-all"
                      style={{ width: `${(Math.min(active + 1, cards.length) / Math.max(cards.length, 1)) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => setImmersive(false)}
                    aria-label="메뉴 보기"
                    className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg font-bold backdrop-blur"
                  >
                    ☰
                  </button>
                </>
              )}
              {/* 진행 표시: 카드 위치 + 자동 넘김 타이머 */}
              <div className={`shrink-0 px-3 sm:px-5 ${fullscreen ? 'hidden' : ''}`}>
                <div className="flex items-center justify-between pb-1 text-[11px] font-bold text-white/70">
                  <span>
                    {Math.min(active + 1, cards.length)} / {cards.length}
                  </span>
                  <button
                    onClick={() => setAuto((on) => !on)}
                    title="자동 넘김 (스페이스)"
                    className={`min-h-[28px] rounded-full px-2.5 ${
                      auto ? 'bg-white text-neutral-900' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {auto ? '❚❚ 자동 넘김 중' : '▶ 자동 넘김'}
                  </button>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/20">
                  {auto ? (
                    <div key={active} className="reel-timer h-full bg-white" style={{ animationDuration: `${AUTO_SECONDS}s` }} />
                  ) : (
                    <div
                      className="h-full bg-white transition-all"
                      style={{ width: `${(Math.min(active + 1, cards.length) / Math.max(cards.length, 1)) * 100}%` }}
                    />
                  )}
                </div>
              </div>

              <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="no-scrollbar min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
              >
                {cards.map((card) =>
                  card.item ? (
                    <NewsCard
                      key={card.key}
                      item={card.item}
                      isNew={card.item.collectedAt === latestBatch && !read.ids.has(card.key)}
                      saved={saved.ids.has(card.key)}
                      onSave={() => saved.toggle(card.key)}
                      onShare={async () => {
                        const item = card.item!
                        const translated = item.lang === 'en' && item.titleKo
                        const message = await shareLink(
                          translated ? item.titleKo! : item.title,
                          (translated ? item.summaryKo : item.summary) || '',
                          item.link
                        )
                        if (message) showToast(message)
                      }}
                    />
                  ) : (
                    <TopicCard
                      key={card.key}
                      topic={card.topic!}
                      saved={saved.ids.has(card.key)}
                      onSave={() => saved.toggle(card.key)}
                    />
                  )
                )}
                <EndCard empty={cards.length === 0} onRestart={() => goTo(0)} />
              </div>

              {/* 넓은 화면용 이동 버튼 */}
              <div className="absolute -right-16 bottom-6 hidden flex-col gap-2 md:flex">
                <button onClick={() => goTo(active - 1)} title="이전 (↑)" className="h-12 w-12 rounded-full bg-white/10 text-lg hover:bg-white/20">
                  ↑
                </button>
                <button onClick={() => goTo(active + 1)} title="다음 (↓)" className="h-12 w-12 rounded-full bg-white/10 text-lg hover:bg-white/20">
                  ↓
                </button>
              </div>
            </div>
          )}

          {toast && (
            <p className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 shadow-lg">
              {toast}
            </p>
          )}
        </main>
      </div>
    </>
  )
}
