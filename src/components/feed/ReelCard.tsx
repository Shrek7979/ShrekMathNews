import React, { useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { CATEGORY_ACCENT, FeedItem, TOPIC_CATEGORY, Topic, formatDate, formatViews } from '@/lib/feed'
import TopicVisual, { hasTopicVisual } from './TopicVisual'

// 카드 바탕은 모두 같은 어두운 단색. 카테고리는 글자 색 하나로만 구분해 읽는 데 집중하게 함
function CardShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className="h-full snap-start snap-always sm:py-2">
      <div className={`flex h-full flex-col overflow-hidden bg-neutral-900 sm:rounded-3xl ${className}`}>{children}</div>
    </section>
  )
}

// "교육 · 충남일보 · 10. 2. (금)" 한 줄
function MetaLine({ category, details, isNew }: { category: string; details: string[]; isNew?: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] font-semibold">
      <span className={CATEGORY_ACCENT[category] || 'text-white'}>{category}</span>
      {details.map((detail) => (
        <span key={detail} className="text-white/45">
          · {detail}
        </span>
      ))}
      {isNew && <span className="ml-1 rounded bg-yellow-300 px-1.5 text-[11px] font-bold text-neutral-900">NEW</span>}
    </p>
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
      className={`min-h-[48px] rounded-xl px-4 text-[15px] font-semibold transition ${
        active ? 'bg-yellow-300 text-neutral-900' : 'bg-white/10 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}

// 섬네일: 카드 위쪽 42% 를 차지
function Thumbnail({ item }: { item: FeedItem }) {
  const { basePath } = useRouter()
  if (!item.thumb) return null
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="relative block h-[42%] max-h-[420px] min-h-[140px] shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${basePath}${item.thumb}`} alt="" className="h-full w-full object-cover" loading="lazy" />
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
  const details = [
    item.source,
    !item.evergreen && formatDate(item.publishedAt),
    item.views && `조회 ${formatViews(item.views)}`,
    item.lang === 'en' && (translated ? (item.translator === 'mymemory' ? '자동 번역' : '번역') : '영문'),
  ].filter(Boolean) as string[]

  return (
    <CardShell>
      <Thumbnail item={item} />

      <div className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-4">
        <MetaLine category={item.category} details={details} isNew={isNew} />

        <div className="mt-2 min-h-0 flex-1 overflow-hidden">
          <h2 className="line-clamp-3 break-keep text-[1.5rem] font-bold leading-[1.35] tracking-tight [text-wrap:balance]">
            {title}
          </h2>
          {translated && <p className="mt-1.5 line-clamp-1 text-[13px] text-white/40">{item.title}</p>}
          {summary && <p className="mt-3 line-clamp-2 break-keep text-[15px] leading-relaxed text-white/65">{summary}</p>}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-white text-[15px] font-bold text-neutral-900 transition hover:bg-white/90"
          >
            {isVideo ? '영상 보기' : item.evergreen ? `${item.source}에서 보기` : '원문 보기'}
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
    <CardShell className="topic-card">
      {animated && (
        <div className="topic-visual h-[30%] max-h-[300px] min-h-[130px] shrink-0 bg-indigo-950 px-2 pt-2">
          <TopicVisual topicId={topic.id} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-4">
        <MetaLine category={TOPIC_CATEGORY} details={[topic.tag]} />
        <h2 className="topic-title mt-1.5 break-keep text-[1.25rem] font-bold leading-[1.3] [text-wrap:balance]">{topic.title}</h2>

        <div
          ref={slidesRef}
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="no-scrollbar -mx-5 mt-3 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
        >
          {topic.slides.map((s, i) => (
            <div key={i} className="w-full shrink-0 snap-center px-5">
              {/* 설명은 위에서부터 채움. 본문의 빈 줄은 문단으로 나눔 */}
              <div className="no-scrollbar h-full overflow-y-auto rounded-2xl bg-white/[0.06] p-4">
                <h3 className="topic-slide-heading break-keep text-[17px] font-bold leading-snug">{s.heading}</h3>
                {s.body.split(/\n{2,}/).map((paragraph, k) => (
                  <p key={k} className="topic-slide-text mt-2 whitespace-pre-line break-keep text-[14px] leading-[1.6] text-white/70">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {topic.slides.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <ActionButton onClick={() => goTo(slide - 1)} label="이전 슬라이드">
            ←
          </ActionButton>
          <button
            onClick={() => goTo(slide === last ? 0 : slide + 1)}
            className="min-h-[48px] flex-1 rounded-xl bg-white text-[15px] font-bold text-neutral-900 transition hover:bg-white/90"
          >
            {slide === last ? '처음으로' : '다음'}
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
        <h2 className="text-2xl font-bold">{empty ? '아직 카드가 없어요' : '오늘 소식은 여기까지'}</h2>
        <p className="break-keep leading-relaxed text-white/60">
          {empty ? '다른 카테고리를 골라 보세요.' : '매일 오전 7시 · 오후 2시에 새 카드가 들어옵니다.'}
        </p>
        {!empty && (
          <button onClick={onRestart} className="min-h-[48px] rounded-xl bg-white px-6 font-bold text-neutral-900">
            처음부터 다시 보기
          </button>
        )}
      </div>
    </section>
  )
}
