import React, { useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { CATEGORY_STYLE, FeedItem, TOPIC_CATEGORY, Topic, formatDate, formatViews, symbolFor } from '@/lib/feed'
import TopicVisual, { hasTopicVisual } from './TopicVisual'

function CardShell({ category, symbol, children }: { category: string; symbol: string; children: React.ReactNode }) {
  return (
    <section className="h-full snap-start snap-always sm:py-2">
      <div
        className={`relative h-full overflow-hidden bg-gradient-to-b sm:rounded-3xl ${
          CATEGORY_STYLE[category] || CATEGORY_STYLE['교육']
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 select-none font-serif text-[15rem] leading-none text-white/10"
        >
          {symbol}
        </span>
        <div className="relative flex h-full flex-col">{children}</div>
      </div>
    </section>
  )
}

function Chip({ children, solid }: { children: React.ReactNode; solid?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur ${
        solid ? 'bg-yellow-300 text-neutral-900' : 'bg-black/35 text-white'
      }`}
    >
      {children}
    </span>
  )
}

function ActionButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`min-h-[48px] rounded-2xl px-4 text-[15px] font-bold transition ${
        active ? 'bg-yellow-300 text-neutral-900' : 'bg-white/15 hover:bg-white/25'
      }`}
    >
      {children}
    </button>
  )
}

// 섬네일: 카드 위쪽 40% 를 차지. 없으면 카테고리 그라디언트가 그대로 보임
function Thumbnail({ item }: { item: FeedItem }) {
  const { basePath } = useRouter()
  if (!item.thumb) return null
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="relative block h-[38%] max-h-[340px] min-h-[140px] shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${basePath}${item.thumb}`} alt="" className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
      {item.kind === 'video' && (
        <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/60 pl-1 text-3xl">
          ▶
        </span>
      )}
    </a>
  )
}

type NewsCardProps = {
  item: FeedItem
  isNew: boolean
  saved: boolean
  onSave: () => void
  onShare: () => void
}

export function NewsCard({ item, isNew, saved, onSave, onShare }: NewsCardProps) {
  const isVideo = item.kind === 'video'
  const translated = item.lang === 'en' && item.titleKo
  const title = translated ? item.titleKo! : item.title
  const summary = translated ? item.summaryKo || item.summary : item.summary

  return (
    <CardShell category={item.category} symbol={symbolFor(item.id)}>
      <Thumbnail item={item} />

      <div className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{item.category === '인기' ? '🔥 인기' : item.category}</Chip>
          {item.views && <Chip>조회 {formatViews(item.views)}</Chip>}
          {item.lang === 'en' && <Chip>{translated ? (item.translator === 'mymemory' ? '자동 번역' : '번역') : 'EN'}</Chip>}
          {isNew && <Chip solid>NEW</Chip>}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-hidden">
          <h2 className="line-clamp-3 break-keep text-[1.45rem] font-extrabold leading-[1.3] tracking-tight [text-wrap:balance]">
            {title}
          </h2>
          {translated && <p className="mt-1.5 line-clamp-1 text-[13px] leading-snug text-white/55">{item.title}</p>}
          {summary && <p className="mt-3 line-clamp-2 break-keep text-[1rem] leading-relaxed text-white/85">{summary}</p>}
          <p className="mt-3 text-[13px] font-medium text-white/60">
            {item.source} · {formatDate(item.publishedAt)}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-white text-[15px] font-bold text-neutral-900 transition hover:bg-white/90"
          >
            {isVideo ? '영상 보기' : '원문 보기'} →
          </a>
          <ActionButton onClick={onSave} active={saved} label="저장">
            {saved ? '★' : '☆'}
          </ActionButton>
          <ActionButton onClick={onShare} label="공유">
            공유
          </ActionButton>
        </div>
      </div>
    </CardShell>
  )
}

// 수학 주제 카드: 좌우로 넘기는 카드뉴스
export function TopicCard({ topic, saved, onSave }: { topic: Topic; saved: boolean; onSave: () => void }) {
  const slidesRef = useRef<HTMLDivElement>(null)
  const [slide, setSlide] = useState(0)
  const last = topic.slides.length - 1
  const animated = hasTopicVisual(topic.id)

  const goTo = (index: number) => {
    const el = slidesRef.current
    if (el) el.scrollTo({ left: el.clientWidth * index, behavior: 'smooth' })
  }

  return (
    <CardShell category={TOPIC_CATEGORY} symbol={symbolFor(topic.id)}>
      {animated && (
        <div className="h-[34%] max-h-[300px] min-h-[130px] shrink-0 bg-black/30 px-2 pt-2">
          <TopicVisual topicId={topic.id} />
        </div>
      )}
      <div className={`flex min-h-0 flex-1 flex-col px-5 pb-3 ${animated ? 'pt-3' : 'pt-4'}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{TOPIC_CATEGORY}</Chip>
          <Chip>{topic.tag}</Chip>
        </div>
        <h2
          className={`break-keep font-extrabold leading-[1.3] [text-wrap:balance] ${
            animated ? 'mt-2 text-[1.25rem]' : 'mt-3 text-[1.45rem]'
          }`}
        >
          {topic.title}
        </h2>

        <div
          ref={slidesRef}
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="no-scrollbar -mx-5 mt-3 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
        >
          {topic.slides.map((s, i) => (
            <div key={i} className="w-full shrink-0 snap-center px-5">
              <div
                className={`no-scrollbar flex h-full flex-col justify-center overflow-y-auto rounded-2xl bg-black/25 ${
                  animated ? 'p-4' : 'p-5'
                }`}
              >
                {!animated && (
                  <p className="mb-2 text-xs font-bold text-white/60">
                    {i + 1} / {topic.slides.length}
                  </p>
                )}
                <h3 className={`break-keep font-bold leading-snug text-yellow-200 ${animated ? 'text-lg' : 'text-xl'}`}>
                  {s.heading}
                </h3>
                <p className={`break-keep text-white/90 ${animated ? 'mt-2 text-[15px] leading-normal' : 'mt-3 text-[1rem] leading-relaxed'}`}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {topic.slides.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <ActionButton onClick={() => goTo(slide - 1)} label="이전 슬라이드">
            ←
          </ActionButton>
          <button
            onClick={() => goTo(slide === last ? 0 : slide + 1)}
            className="min-h-[48px] flex-1 rounded-2xl bg-white text-[15px] font-bold text-neutral-900 transition hover:bg-white/90"
          >
            {slide === last ? '처음으로' : '다음 →'}
          </button>
          <ActionButton onClick={onSave} active={saved} label="저장">
            {saved ? '★' : '☆'}
          </ActionButton>
        </div>
      </div>
    </CardShell>
  )
}

export function EndCard({ onRestart, empty }: { onRestart: () => void; empty: boolean }) {
  return (
    <section className="h-full snap-start sm:py-2">
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-neutral-900 p-8 text-center sm:rounded-3xl">
        <span className="font-serif text-7xl text-white/30">∎</span>
        <h2 className="text-2xl font-extrabold">{empty ? '아직 카드가 없어요' : '오늘 소식은 여기까지'}</h2>
        <p className="break-keep leading-relaxed text-white/70">
          {empty ? '다른 카테고리를 골라 보세요.' : '매일 오전 7시 · 오후 2시에 새 카드가 들어옵니다.'}
        </p>
        {!empty && (
          <button onClick={onRestart} className="min-h-[48px] rounded-2xl bg-white px-6 font-bold text-neutral-900">
            ↑ 처음부터 다시 보기
          </button>
        )}
      </div>
    </section>
  )
}
