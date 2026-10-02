import React from 'react'
import Link from 'next/link'

export default function Home() {
  // 샘플 데이터
  const latestNews = [
    { id: 1, title: '2025 국제 수학 올림피아드 개최 예정', date: '2025-10-14' },
    { id: 2, title: '새로운 소수 발견! 역대 최대 규모', date: '2025-10-13' },
    { id: 3, title: '수학 교육 혁신 프로그램 발표', date: '2025-10-12' },
  ]

  const popularPosts = [
    { id: 1, title: '고등학교 수학 공식 정리 자료', author: '김수학', views: 1234 },
    { id: 2, title: '대학 미적분학 강의 노트', author: '이교수', views: 987 },
    { id: 3, title: '수학 경시대회 기출문제 모음', author: '박선생', views: 856 },
  ]

  const upcomingEvents = [
    { id: 1, title: '한국수학올림피아드 예선', date: '2025-11-05' },
    { id: 2, title: '수학 교사 연수 프로그램', date: '2025-11-12' },
    { id: 3, title: '대학생 수학 경시대회', date: '2025-11-20' },
  ]

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            수학의 모든 것, Math Insight Hub
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-100">
            뉴스, 자료, 커뮤니티가 한곳에
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/news"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              최신 뉴스 보기
            </Link>
            <Link
              href="/board"
              className="bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors border-2 border-white"
            >
              자료실 둘러보기
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Latest News */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">최신 뉴스</h2>
              <Link href="/news" className="text-primary-600 hover:text-primary-700 text-sm">
                더보기 →
              </Link>
            </div>
            <ul className="space-y-3">
              {latestNews.map((news) => (
                <li key={news.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <Link href={`/news/${news.id}`} className="hover:text-primary-600">
                    <h3 className="font-medium text-gray-800 mb-1">{news.title}</h3>
                    <p className="text-sm text-gray-500">{news.date}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Posts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">인기 게시글</h2>
              <Link href="/board" className="text-primary-600 hover:text-primary-700 text-sm">
                더보기 →
              </Link>
            </div>
            <ul className="space-y-3">
              {popularPosts.map((post) => (
                <li key={post.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <Link href={`/board/${post.id}`} className="hover:text-primary-600">
                    <h3 className="font-medium text-gray-800 mb-1">{post.title}</h3>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{post.author}</span>
                      <span>조회 {post.views}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">대회 일정</h2>
              <Link href="/notice" className="text-primary-600 hover:text-primary-700 text-sm">
                더보기 →
              </Link>
            </div>
            <ul className="space-y-3">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <h3 className="font-medium text-gray-800 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500">📅 {event.date}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Math Insight Hub의 특징
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">📰</div>
              <h3 className="text-xl font-semibold mb-2">실시간 뉴스</h3>
              <p className="text-gray-600">
                국내외 수학 관련 뉴스를 실시간으로 수집하여 제공합니다
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">풍부한 자료</h3>
              <p className="text-gray-600">
                교육 자료, 문제, 강의 노트 등 다양한 수학 자료를 공유합니다
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">활발한 커뮤니티</h3>
              <p className="text-gray-600">
                교사, 학생, 연구자가 함께 소통하는 수학 커뮤니티입니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

