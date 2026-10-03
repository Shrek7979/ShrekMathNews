import React from 'react'
import { useRouter } from 'next/router'
import { CATEGORY_ACCENT, FeedItem, Topic, formatViews, timeAgo } from '@/lib/feed'

type BriefingProps = {
  items: FeedItem[]
  topic?: Topic
  latestBatch: string | null
  now: number | null
  savedIds: Set<string>
  readIds: Set<string>
  onSave: (id: string) => void
  onRead: (id: string) => void
  onOpenTopic: () => void
}

// 한눈에 보기: 최신 순으로 제목만 빠르게 훑는 목록
export default function Briefing(props: BriefingProps) {
  const { items, topic, latestBatch, now, savedIds, readIds, onSave, onRead, onOpenTopic } = props
  const { basePath } = useRouter()
  // 최신 글이 맨 위. 날짜가 없는 바로가기 카드(인스타·페이스북)는 맨 아래
  const sorted = [...items].sort(
    (a, b) => Number(a.evergreen || false) - Number(b.evergreen || false) || b.publishedAt.localeCompare(a.publishedAt)
  )

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-2xl px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-2">
        {topic && (
          <button
            onClick={onOpenTopic}
            className="mb-5 w-full rounded-2xl bg-white/[0.06] p-4 text-left"
          >
            <p className="text-xs font-semibold text-fuchsia-400">오늘의 수학 · {topic.tag}</p>
            <p className="mt-1 break-keep text-[17px] font-bold leading-snug">{topic.title}</p>
          </button>
        )}

        {sorted.length === 0 && <p className="py-20 text-center text-white/60">표시할 소식이 없어요.</p>}

        <ul className="border-t border-white/10">
              {sorted.map((item) => {
                const read = readIds.has(item.id)
                const title = item.lang === 'en' && item.titleKo ? item.titleKo : item.title
                return (
                  <li key={item.id} className="flex items-start gap-3 border-b border-white/10 py-3">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onRead(item.id)}
                      className={`flex min-w-0 flex-1 gap-3 ${read ? 'opacity-50' : ''}`}
                    >
                      {item.thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${basePath}${item.thumb}`}
                          alt=""
                          loading="lazy"
                          className="h-16 w-20 shrink-0 rounded-lg bg-white/10 object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 break-keep text-[15px] font-semibold leading-snug">
                          {item.collectedAt === latestBatch && !read && (
                            <span className="mr-1.5 inline-block h-2 w-2 -translate-y-0.5 rounded-full bg-yellow-300" />
                          )}
                          {item.kind === 'video' && '▶ '}
                          {title}
                        </span>
                        <span className="mt-1 block text-xs text-white/50">
                          <span className={`font-semibold ${CATEGORY_ACCENT[item.category] || ''}`}>{item.category}</span>
                          {' · '}
                          {item.source}
                          {item.views && ` · 조회 ${formatViews(item.views)}`}
                          {item.lang === 'en' && ' · 번역'}
                          {now && !item.evergreen && ` · ${timeAgo(item.publishedAt, now)}`}
                        </span>
                      </span>
                    </a>
                    <button
                      onClick={() => onSave(item.id)}
                      aria-label="저장"
                      aria-pressed={savedIds.has(item.id)}
                      className={`-mr-2 min-h-[44px] min-w-[44px] text-xl ${
                        savedIds.has(item.id) ? 'text-yellow-300' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {savedIds.has(item.id) ? '★' : '☆'}
                    </button>
                  </li>
                )
              })}
        </ul>
      </div>
    </div>
  )
}
