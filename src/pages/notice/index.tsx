import React from 'react'
import Link from 'next/link'

export default function NoticePage() {
  // 샘플 공지사항 데이터
  const notices = [
    {
      id: 1,
      title: 'Math Insight Hub 정식 오픈 안내',
      date: '2025-10-15',
      views: 542,
      isImportant: true
    },
    {
      id: 2,
      title: '2025 국제 수학 올림피아드 일정 안내',
      date: '2025-10-14',
      views: 423,
      isImportant: true
    },
    {
      id: 3,
      title: '개인정보처리방침 업데이트 안내',
      date: '2025-10-12',
      views: 156,
      isImportant: false
    },
    {
      id: 4,
      title: '서버 점검 안내 (10/20 02:00~04:00)',
      date: '2025-10-10',
      views: 289,
      isImportant: false
    },
  ]

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">공지사항</h1>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/notice/${notice.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {notice.isImportant && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          중요
                        </span>
                      )}
                      <h2 className="text-xl font-semibold text-gray-800 hover:text-primary-600">
                        {notice.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📅 {notice.date}</span>
                      <span>👁️ 조회 {notice.views}</span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
              이전
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg">
              1
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
              2
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

