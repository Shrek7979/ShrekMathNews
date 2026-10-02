import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import * as cheerio from 'cheerio'

type NewsItem = {
  title: string
  link: string
  summary?: string
  date?: string
  source?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 메서드입니다.' })
  }

  const { url, selector } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL이 필요합니다.' })
  }

  try {
    // 웹페이지 가져오기
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)
    const newsItems: NewsItem[] = []

    // 기본 셀렉터 또는 사용자 정의 셀렉터 사용
    const articleSelector = selector || 'article, .news-item, .post, .article'
    
    $(articleSelector).each((index, element) => {
      if (index >= 20) return false // 최대 20개까지만

      const $element = $(element)
      
      // 제목 찾기
      const title = $element.find('h1, h2, h3, h4, .title, .headline').first().text().trim()
      
      // 링크 찾기
      let link = $element.find('a').first().attr('href') || ''
      if (link && !link.startsWith('http')) {
        const baseUrl = new URL(url).origin
        link = new URL(link, baseUrl).href
      }
      
      // 요약 찾기
      const summary = $element.find('p, .summary, .description, .excerpt').first().text().trim()
      
      // 날짜 찾기
      const date = $element.find('time, .date, .published').first().text().trim()
      
      if (title && title.length > 0) {
        newsItems.push({
          title,
          link,
          summary: summary || undefined,
          date: date || undefined,
          source: new URL(url).hostname
        })
      }
    })

    // 아무것도 찾지 못한 경우 대체 방법 시도
    if (newsItems.length === 0) {
      $('h1, h2, h3').each((index, element) => {
        if (index >= 20) return false
        
        const $element = $(element)
        const title = $element.text().trim()
        const link = $element.find('a').attr('href') || $element.closest('a').attr('href') || ''
        
        if (title && title.length > 10) {
          let fullLink = link
          if (link && !link.startsWith('http')) {
            const baseUrl = new URL(url).origin
            fullLink = new URL(link, baseUrl).href
          }
          
          newsItems.push({
            title,
            link: fullLink,
            source: new URL(url).hostname
          })
        }
      })
    }

    return res.status(200).json({
      success: true,
      count: newsItems.length,
      items: newsItems
    })

  } catch (error: any) {
    console.error('크롤링 오류:', error.message)
    return res.status(500).json({
      error: '크롤링 중 오류가 발생했습니다.',
      details: error.message
    })
  }
}

