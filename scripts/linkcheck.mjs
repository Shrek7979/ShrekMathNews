// 카드의 원문 링크가 사라졌는지(404 등) 확인합니다. 사라진 카드는 피드에서 뺍니다.
// 봇을 막는 사이트(403·400·429, Cloudflare 확인 화면)나 일시적인 연결 실패는 '살아 있음'으로 봄
// → 브라우저에서는 잘 열리는 카드를 실수로 지우지 않게 함
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// 상태 코드는 200 이지만 실제로는 '없는 페이지'인 경우의 제목
const SOFT_404_TITLE = /\b404\b|not found|찾을 수 없|존재하지 않|삭제된 (기사|게시물|글)|isn['’]t available|오류 페이지|error page/i

// 사라졌으면 그 이유를, 살아 있거나 알 수 없으면 null
export async function deadReason(url) {
  // 유튜브는 지워진 영상도 200 으로 답하므로 oEmbed 로 확인 (지워졌거나 없는 영상이면 400/404)
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(15000) })
      return res.status === 400 || res.status === 404 ? '삭제된 영상' : null
    } catch {
      return null
    }
  }
  let res
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })
  } catch (error) {
    // 도메인 자체가 없어진 사이트
    const code = error.cause?.code
    return code === 'ENOTFOUND' ? '사이트 없음' : null
  }
  if (res.status === 404 || res.status === 410) return `HTTP ${res.status}`
  if (!res.ok) return null
  if (!(res.headers.get('content-type') || '').includes('html')) return null
  const html = (await res.text()).slice(0, 300000)
  const title = (html.match(/<title[^>]*>([^<]*)/i)?.[1] || '').trim()
  if (SOFT_404_TITLE.test(title)) return `없는 페이지 ("${title.slice(0, 40)}")`  // 기사가 지워지면 사이트 첫 화면으로 돌려보내는 언론사가 있음
  const from = new URL(url)
  const to = new URL(res.url)
  if (to.pathname === '/' && !to.search && (from.pathname !== '/' || from.search)) return '첫 화면으로 이동됨'
  return null
}

// 여러 링크를 동시에 몇 개씩 확인. 사라진 카드의 id → 이유
export async function findDeadLinks(items, { concurrency = 6 } = {}) {
  const dead = new Map()
  const queue = items.filter((item) => item.link && !item.evergreen)
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let item; (item = queue.shift()); ) {
        const reason = await deadReason(item.link)
        if (reason) dead.set(item.id, reason)
      }
    })
  )
  return dead
}
