import React, { useState } from 'react'
import Link from 'next/link'

export default function BoardPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // 샘플 게시글 데이터
  const posts = [
    {
      id: 1,
      title: '고등학교 수학 공식 정리 자료',
      author: '김수학',
      date: '2025-10-14',
      views: 1234,
      likes: 89,
      comments: 23,
      category: '학습자료',
      hasFile: true
    },
    {
      id: 2,
      title: '대학 미적분학 강의 노트',
      author: '이교수',
      date: '2025-10-13',
      views: 987,
      likes: 65,
      comments: 18,
      category: '강의노트',
      hasFile: true
    },
    {
      id: 3,
      title: '수학 경시대회 기출문제 모음',
      author: '박선생',
      date: '2025-10-12',
      views: 856,
      likes: 54,
      comments: 31,
      category: '기출문제',
      hasFile: true
    },
    {
      id: 4,
      title: '선형대수학 질문 있습니다',
      author: '최학생',
      date: '2025-10-11',
      views: 456,
      likes: 12,
      comments: 8,
      category: '질문',
      hasFile: false
    },
    {
      id: 5,
      title: '확률과 통계 요약 정리',
      author: '정선생',
      date: '2025-10-10',
      views: 678,
      likes: 43,
      comments: 15,
      category: '학습자료',
      hasFile: true
    },
  ]

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">자료실</h1>
          <Link
            href="/board/write"
            className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            글쓰기
          </Link>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="제목 또는 작성자로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              검색
            </button>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    작성자
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    조회
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    좋아요
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-primary-600">
                        {post.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/board/${post.id}`}
                        className="text-gray-800 hover:text-primary-600 font-medium"
                      >
                        {post.title}
                        {post.hasFile && (
                          <span className="ml-2 text-gray-400">📎</span>
                        )}
                        {post.comments > 0 && (
                          <span className="ml-2 text-sm text-gray-500">
                            [{post.comments}]
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {post.author}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {post.date}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {post.views}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      ❤️ {post.likes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md mt-6">
            <p className="text-gray-500 text-lg">검색 결과가 없습니다.</p>
          </div>
        )}

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
              3
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

