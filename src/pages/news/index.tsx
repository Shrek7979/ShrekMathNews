import React, { useState, useEffect } from 'react'
import Link from 'next/link'

type NewsItem = {
  id?: number
  title: string
  summary?: string
  category?: string
  date?: string
  source?: string
  image?: string
  link?: string
}

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [useSampleData, setUseSampleData] = useState(true)

  const categories = ['전체', '국제', '국내', '대회', '연구', '교육']

  // 샘플 뉴스 데이터
  const sampleNewsItems = [
    {
      id: 1,
      title: '2025 국제 수학 올림피아드 개최 예정',
      summary: '올해 국제 수학 올림피아드가 7월에 개최됩니다. 전 세계 100개국 이상이 참가할 예정입니다.',
      category: '대회',
      date: '2025-10-14',
      source: 'IMO',
      image: '📐'
    },
    {
      id: 2,
      title: '새로운 소수 발견! 역대 최대 규모',
      summary: 'GIMPS 프로젝트를 통해 2^82,589,933 − 1의 형태를 가진 새로운 메르센 소수가 발견되었습니다.',
      category: '연구',
      date: '2025-10-13',
      source: 'Nature',
      image: '🔢'
    },
    {
      id: 3,
      title: '수학 교육 혁신 프로그램 발표',
      summary: '교육부가 AI를 활용한 맞춤형 수학 교육 프로그램을 도입한다고 발표했습니다.',
      category: '교육',
      date: '2025-10-12',
      source: '교육부',
      image: '🎓'
    },
    {
      id: 4,
      title: '한국 대표팀, 아시아 수학 경시대회 우승',
      summary: '한국 대표팀이 아시아 수학 경시대회에서 종합 1위를 차지했습니다.',
      category: '국내',
      date: '2025-10-11',
      source: '한국수학올림피아드',
      image: '🏆'
    },
    {
      id: 5,
      title: '필즈상 수상자 특별 강연회 개최',
      summary: '2024 필즈상 수상자들의 특별 강연회가 서울대학교에서 개최됩니다.',
      category: '국제',
      date: '2025-10-10',
      source: 'ICM',
      image: '🎤'
    },
  ]

  // 크롤링된 데이터 불러오기
  useEffect(() => {
    const crawledNews = localStorage.getItem('crawledNews')
    if (crawledNews) {
      try {
        const parsed = JSON.parse(crawledNews)
        if (parsed && parsed.length > 0) {
          // 크롤링된 데이터를 표시 형식에 맞게 변환
          const formattedNews = parsed.map((item: any, index: number) => ({
            id: index + 1,
            title: item.title,
            summary: item.summary || '요약 정보가 없습니다.',
            category: '크롤링',
            date: item.date || new Date().toISOString().split('T')[0],
            source: item.source || '알 수 없음',
            image: '📰',
            link: item.link
          }))
          setNewsItems(formattedNews)
          setUseSampleData(false)
        } else {
          setNewsItems(sampleNewsItems)
        }
      } catch (e) {
        setNewsItems(sampleNewsItems)
      }
    } else {
      setNewsItems(sampleNewsItems)
    }
  }, [])

  const filteredNews = selectedCategory === '전체' 
    ? newsItems 
    : newsItems.filter(news => news.category === selectedCategory)

  const clearCrawledData = () => {
    if (confirm('크롤링된 데이터를 삭제하고 샘플 데이터로 돌아가시겠습니까?')) {
      localStorage.removeItem('crawledNews')
      setNewsItems(sampleNewsItems)
      setUseSampleData(true)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">수학 뉴스</h1>
            <p className="text-gray-600">
              {useSampleData ? '📝 샘플 데이터를 표시하고 있습니다.' : '🌐 크롤링된 데이터를 표시하고 있습니다.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/crawl"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              🔍 크롤링 관리
            </Link>
            {!useSampleData && (
              <button
                onClick={clearCrawledData}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                🗑️ 데이터 초기화
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((news, index) => {
            const content = (
              <div className="p-6">
                <div className="text-5xl mb-4">{news.image || '📰'}</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-primary-600">
                    {news.category}
                  </span>
                  <span className="text-sm text-gray-500">{news.date}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                  {news.title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-3">{news.summary}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span>출처: {news.source}</span>
                </div>
              </div>
            )

            // 크롤링된 뉴스면 외부 링크, 아니면 내부 링크
            if (news.link) {
              return (
                <a
                  key={news.id || index}
                  href={news.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {content}
                </a>
              )
            } else {
              return (
                <Link
                  key={news.id || index}
                  href={`/news/${news.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {content}
                </Link>
              )
            }
          })}
        </div>

        {/* Empty State */}
        {filteredNews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">해당 카테고리의 뉴스가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

