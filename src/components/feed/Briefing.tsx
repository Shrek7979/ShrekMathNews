import React from 'react'
import { useRouter } from 'next/router'
import { CATEGORY_ORDER, FeedItem, Topic, formatViews, timeAgo } from '@/lib/feed'

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

// 한눈에 보기: 카테고리별로 제목만 빠르게 훑는 목록
export default function Briefing(props: BriefingProps) {
  const { items, topic, latestBatch, now, savedIds, readIds, onSave, onRead, onOpenTopic } = props
  const { basePath } = useRouter()
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-2xl px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-2">
        {topic && (
          <button
            onClick={onOpenTopic}
            className="mb-5 w-full rounded-2xl bg-gradient-to-br from-fuchsia-600 to-indigo-900 p-4 text-left"
          >
            <p className="text-xs font-bold text-white/70">오늘의 수학 주제 · {topic.tag}</p>
            <p className="mt-1 break-keep text-[17px] font-extrabold leading-snug">{topic.title}</p>
            <p className="mt-1.5 text-sm font-semibold text-yellow-200">카드로 보기 →</p>
          </button>
        )}

        {groups.length === 0 && <p className="py-20 text-center text-white/60">표시할 소식이 없어요.</p>}

        {groups.map((group) => (
          <section key={group.category} className="mb-6">
            <h2 className="mb-1 flex items-baseline gap-2 border-b border-white/15 pb-2 text-[17px] font-extrabold">
              {group.category}
              <span className="text-sm font-medium text-white/50">{group.items.length}</span>
            </h2>
            <ul>
              {group.items.map((item) => {
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
                          {item.source}
                          {item.views && ` · 조회 ${formatViews(item.views)}`}
                          {item.lang === 'en' && ' · 번역'}
                          {now && ` · ${timeAgo(item.publishedAt, now)}`}
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
          </section>
        ))}
      </div>
    </div>
  )
}
