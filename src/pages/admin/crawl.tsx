import React, { useState } from 'react'
import { useRouter } from 'next/router'

type NewsItem = {
  title: string
  link: string
  summary?: string
  date?: string
  source?: string
}

export default function CrawlAdminPage() {
  const [url, setUrl] = useState('')
  const [selector, setSelector] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<NewsItem[]>([])
  const [error, setError] = useState('')

  // 미리 정의된 사이트 템플릿
  const presetSites = [
    {
      name: '네이버 뉴스 - 과학',
      url: 'https://news.naver.com/section/105',
      selector: '.sa_text'
    },
    {
      name: 'BBC News - Science',
      url: 'https://www.bbc.com/news/science-environment',
      selector: 'article'
    },
    {
      name: 'arXiv - Mathematics',
      url: 'https://arxiv.org/list/math/recent',
      selector: '.list-title'
    }
  ]

  const handleCrawl = async () => {
    if (!url) {
      setError('URL을 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')
    setResults([])

    try {
      const response = await fetch('/api/news/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, selector })
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.items)
        if (data.count === 0) {
          setError('뉴스를 찾을 수 없습니다. 다른 셀렉터나 URL을 시도해보세요.')
        }
      } else {
        setError(data.error || '크롤링에 실패했습니다.')
      }
    } catch (err: any) {
      setError('서버 오류가 발생했습니다: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPreset = (preset: typeof presetSites[0]) => {
    setUrl(preset.url)
    setSelector(preset.selector)
    setError('')
    setResults([])
  }

  const saveToDatabase = () => {
    // TODO: 실제로는 Firebase나 데이터베이스에 저장
    localStorage.setItem('crawledNews', JSON.stringify(results))
    alert(`${results.length}개의 뉴스가 저장되었습니다!`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">뉴스 크롤링 관리</h1>
          <p className="text-gray-600">웹사이트에서 수학 뉴스를 크롤링하여 가져옵니다.</p>
        </div>

        {/* 프리셋 사이트 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">빠른 시작 - 프리셋 사이트</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presetSites.map((preset, index) => (
              <button
                key={index}
                onClick={() => loadPreset(preset)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors text-left"
              >
                <div className="font-semibold text-gray-800 mb-1">{preset.name}</div>
                <div className="text-sm text-gray-500 truncate">{preset.url}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 크롤링 설정 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">크롤링 설정</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                크롤링할 웹사이트 URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/news"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSS 셀렉터 (선택사항)
              </label>
              <input
                type="text"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                placeholder="article, .news-item, .post (비워두면 자동 감지)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                특정 요소를 크롤링하려면 CSS 셀렉터를 입력하세요. 비워두면 자동으로 감지합니다.
              </p>
            </div>

            <button
              onClick={handleCrawl}
              disabled={loading || !url}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '크롤링 중...' : '🔍 크롤링 시작'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* 크롤링 결과 */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                크롤링 결과 ({results.length}개)
              </h2>
              <button
                onClick={saveToDatabase}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                💾 저장하기
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <h3 className="font-semibold text-gray-800 mb-2">{item.title}</h3>
                  {item.summary && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.summary}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{item.date || '날짜 없음'}</span>
                    <span>{item.source}</span>
                  </div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline mt-1 block truncate"
                    >
                      {item.link}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 도움말 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">💡 사용 방법</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>프리셋 사이트</strong>: 위의 버튼을 클릭하여 미리 설정된 사이트를 빠르게 크롤링</li>
            <li>• <strong>커스텀 URL</strong>: 원하는 뉴스 사이트 URL을 입력</li>
            <li>• <strong>CSS 셀렉터</strong>: 특정 요소만 크롤링하려면 CSS 셀렉터 입력 (예: .article, #news-list)</li>
            <li>• <strong>자동 감지</strong>: 셀렉터를 비워두면 자동으로 뉴스 항목을 찾습니다</li>
            <li>• <strong>결과 확인</strong>: 크롤링된 결과를 확인한 후 저장 버튼을 눌러 데이터베이스에 저장</li>
          </ul>
        </div>

        {/* CSS 셀렉터 도움말 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-3">🎯 CSS 셀렉터 예시</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
            <div>
              <strong>기본 셀렉터:</strong>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• <code className="bg-yellow-100 px-1 rounded">article</code> - 모든 article 태그</li>
                <li>• <code className="bg-yellow-100 px-1 rounded">.news-item</code> - news-item 클래스</li>
                <li>• <code className="bg-yellow-100 px-1 rounded">#news-list</code> - news-list ID</li>
              </ul>
            </div>
            <div>
              <strong>조합 셀렉터:</strong>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• <code className="bg-yellow-100 px-1 rounded">div.post</code> - div 태그 중 post 클래스</li>
                <li>• <code className="bg-yellow-100 px-1 rounded">.container article</code> - container 안의 article</li>
                <li>• <code className="bg-yellow-100 px-1 rounded">ul li.item</code> - ul 안의 item 클래스 li</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

