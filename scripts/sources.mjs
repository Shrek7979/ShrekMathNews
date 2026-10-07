// 수집 대상 목록. 여기에 항목을 추가/삭제하면 다음 수집부터 반영됩니다.
// type: bing(빙 뉴스 검색) | rss(일반 RSS/Atom) | youtube(채널 최신) | youtube-top(여러 채널의 최근 영상 중 조회수 상위)
// category 를 적으면 키워드 분류 대신 그 카테고리로 고정

// qft=sortbydate="1": 관련도순이 아니라 최신순으로 받아 방금 나온 기사부터 수집
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 이런 채널의 영상이나 이런 말이 든 제목은 '문제·증명' 칩으로 (신기한 문제 풀이·퍼즐·증명)
export const PROBLEM_CHANNELS = /MindYourDecisions|Mathematical Visual Proofs|blackpenredpen|bprp|Michael Penn|Math Booster|Puzzle Monster|Andy Math|Art of Problem Solving|Art of Olympiad|Mathologer|Another Roof|Cheenta|Mathsmerizing|Calculus Booster|교양수학/i
export const PROBLEM_WORDS = /proof|prove|puzzle|riddle|olympiad|\bIMO\b|증명|퍼즐|난제|경시|올림피아드|문제 풀이/i

// scripts/discover-youtube.mjs 가 찾아 둔 '구독자 1만 명 이상 수학 채널' 목록
function discoveredChannels(lang) {
  try {
    const { channels } = JSON.parse(readFileSync(resolve(process.cwd(), 'data/youtube-channels.json'), 'utf8'))
    return channels.filter((c) => c.lang === lang).map((c) => [c.name, c.id, c.lang])
  } catch {
    return []
  }
}
// 문제 풀이·퍼즐·증명 채널 (찾아 둔 목록에서 이름으로 고름 + 직접 넣은 채널)
function problemChannels() {
  const curated = [
    ['MindYourDecisions', 'UCHnj59g7jezwTy5GeL8EA_g', 'en'],
    ['blackpenredpen', 'UC_SvYP0k05UKiJ_2ndB02IA', 'en'],
    ['Mathologer', 'UC1_uAIS3r8Vu6JjXWvastJg', 'en'],
    ['Mathematical Visual Proofs', 'UCT9Fyqn0izh-wX-wDzKBwAA', 'en'],
  ]
  const ids = new Set(curated.map(([, id]) => id))
  const found = [...discoveredChannels('en'), ...discoveredChannels('ko')].filter(
    ([name, id]) => !ids.has(id) && PROBLEM_CHANNELS.test(name)
  )
  return [...curated, ...found]
}
const withDiscovered = (curated, lang) => {
  const ids = new Set(curated.map(([, id]) => id))
  return [...curated, ...discoveredChannels(lang).filter(([, id]) => !ids.has(id))]
}

const bing = (q) =>
  `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&mkt=ko-KR&qft=${encodeURIComponent('sortbydate="1"')}`
const youtube = (channelId) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`

export const SOURCES = [
  // 국내 뉴스 (빙 뉴스 검색: 기사 원문 링크 + 섬네일 제공. 구글 뉴스는 원문 링크를 숨겨 섬네일을 못 얻으므로 제외)
  { type: 'bing', lang: 'ko', url: bing('수학'), limit: 8, maxAgeDays: 3 },
  { type: 'bing', lang: 'ko', url: bing('수학 교육'), limit: 8, maxAgeDays: 3 },
  { type: 'bing', lang: 'ko', url: bing('수학 교사'), limit: 6, maxAgeDays: 3 },
  { type: 'bing', lang: 'ko', url: bing('수학 수업'), limit: 6, maxAgeDays: 3 },
  { type: 'bing', lang: 'ko', url: bing('수능 수학'), limit: 6, maxAgeDays: 3 },
  { type: 'bing', lang: 'ko', url: bing('수학자'), limit: 5, maxAgeDays: 3 },
  { type: 'bing', lang: 'ko', url: bing('수학 올림피아드'), limit: 4, maxAgeDays: 3 },
  { type: 'bing', lang: 'ko', url: bing('수학 AI'), limit: 5, maxAgeDays: 3 },

  // 교육 전문지 전체 기사 피드 (제목에 '수학' 등이 들어간 기사만 통과)
  { type: 'rss', lang: 'ko', name: '에듀프레스', url: 'https://www.edupress.kr/rss/allArticle.xml', limit: 4, maxAgeDays: 5 },
  { type: 'rss', lang: 'ko', name: '베리타스알파', url: 'https://www.veritas-a.com/rss/allArticle.xml', limit: 3, maxAgeDays: 5 },
  { type: 'rss', lang: 'ko', name: '에듀인뉴스', url: 'https://www.eduinnews.co.kr/rss/allArticle.xml', limit: 3, maxAgeDays: 5 },
  { type: 'rss', lang: 'ko', name: '교수신문', url: 'https://www.kyosu.net/rss/allArticle.xml', limit: 3, maxAgeDays: 5 },

  // 해외 수학 매체
  { type: 'rss', lang: 'en', name: 'Quanta Magazine', trusted: true, url: 'https://www.quantamagazine.org/mathematics/feed/', limit: 3, maxAgeDays: 14 },
  { type: 'rss', lang: 'en', name: 'Phys.org', url: 'https://phys.org/rss-feed/science-news/mathematics/', limit: 3, maxAgeDays: 7 },
  { type: 'rss', lang: 'en', name: 'Science', url: 'https://www.science.org/rss/news_current.xml', require: /\bmath|equation|theorem|proof|conjecture|prime|geometr|algebra|statistic|probabilit|algorithm|calculus/i, limit: 2, maxAgeDays: 7 }, // Science(AAAS) 뉴스 — 제목에 과목 낱말이 있는 기사만
  { type: 'rss', lang: 'en', name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/computers_math/mathematics.xml', limit: 3, maxAgeDays: 7 },
  { type: 'rss', lang: 'en', name: 'Plus Magazine', url: 'https://plus.maths.org/content/rss.xml', limit: 2, maxAgeDays: 30 },

  // 수학 학회·기관 → '학회·기관' 칩
  { type: 'rss', lang: 'en', name: 'IMA (영국 수학응용학회)', trusted: true, category: '학회·기관', url: 'https://www.ima.org.uk/feed/', limit: 2, maxAgeDays: 21 },
  { type: 'rss', lang: 'en', name: 'Oxford Mathematics', trusted: true, category: '학회·기관', url: 'https://www.maths.ox.ac.uk/rss.xml', limit: 2, maxAgeDays: 21 },
  { type: 'rss', lang: 'en', name: 'London Mathematical Society', trusted: true, category: '학회·기관', url: 'https://www.lms.ac.uk/rss.xml', limit: 2, maxAgeDays: 45 },
  { type: 'rss', lang: 'en', name: 'Simons Foundation', category: '학회·기관', url: 'https://www.simonsfoundation.org/feed/', limit: 2, maxAgeDays: 21 },
  { type: 'bing', lang: 'ko', category: '학회·기관', requireTitle: /학회|과학원|수리과학|석학|수학자/, url: bing('대한수학회'), limit: 3, maxAgeDays: 14 },
  { type: 'bing', lang: 'ko', category: '학회·기관', requireTitle: /학회|과학원|수리과학|석학|수학자/, url: bing('수학교육학회'), limit: 3, maxAgeDays: 14 },
  { type: 'bing', lang: 'ko', category: '학회·기관', requireTitle: /학회|과학원|수리과학|석학|수학자/, url: bing('국가수리과학연구소'), limit: 3, maxAgeDays: 14 },
  { type: 'bing', lang: 'ko', category: '학회·기관', requireTitle: /학회|과학원|수리과학|석학|수학자/, url: bing('고등과학원 수학'), limit: 2, maxAgeDays: 14 },

  // 신기한 문제·퍼즐·증명 → '문제·증명' 칩
  { type: 'rss', lang: 'en', name: "Alex Bellos's Monday puzzle", trusted: true, category: '문제·증명', url: 'https://www.theguardian.com/science/series/alex-bellos-monday-puzzle/rss', limit: 2, maxAgeDays: 14 },
  { type: 'rss', lang: 'en', name: 'Futility Closet', category: '문제·증명', url: 'https://www.futilitycloset.com/feed/', limit: 2, maxAgeDays: 14 },
  { type: 'rss', lang: 'en', name: 'Terence Tao', trusted: true, category: '연구', url: 'https://terrytao.wordpress.com/feed/', limit: 1, maxAgeDays: 14 },
  { type: 'rss', lang: 'en', name: 'Gil Kalai', trusted: true, category: '연구', url: 'https://gilkalai.wordpress.com/feed/', limit: 1, maxAgeDays: 14 },

  // 미국 수학 단체: NCTM(전미수학교사협의회) 학술지 MTLT, AMS(미국수학회) 소식·칼럼.
  // (MAA 는 자동 접속을 차단(403)해서 제외)
  // trusted: 수학 전문 매체라 키워드 필터를 건너뜀
  { type: 'rss', lang: 'en', name: 'NCTM', trusted: true, category: '학회·기관', url: 'https://pubs.nctm.org/journalissuetocrss/journals/mtlt/mtlt-overview.xml', limit: 4, maxAgeDays: 45 },
  { type: 'rss', lang: 'en', name: 'AMS', trusted: true, category: '학회·기관', url: 'https://www.ams.org/cgi-bin/content/news_items.cgi?rss=1', limit: 3, maxAgeDays: 30 },
  { type: 'rss', lang: 'en', name: 'AMS Feature Column', trusted: true, url: 'https://mathvoices.ams.org/featurecolumn/feed/', limit: 2, maxAgeDays: 45 },

  // 신기한 문제 풀이·퍼즐·증명 채널의 최근 영상 중 조회수 상위 → '문제·증명' 칩
  {
    type: 'youtube-top',
    name: '유튜브 문제·증명',
    lang: 'en',
    category: '문제·증명',
    limit: 8,
    maxAgeDays: 30,
    minViews: 5000,
    maxPerChannel: 2,
    channels: problemChannels(),
  },

  // SNS 인기 게시물: 수학 유튜브 채널들의 최근 영상 중 조회수가 많은 것만 싣습니다.
  // 국내 채널은 조회수 규모가 작아 해외 채널과 따로 뽑습니다.
  {
    type: 'youtube-top',
    name: '유튜브 인기 (국내)',
    lang: 'ko',
    category: '인기',
    limit: 10,
    maxAgeDays: 30,
    minViews: 3000, // 이 조회수 미만이면 싣지 않음
    maxPerChannel: 2, // 한 채널이 인기 카드를 독차지하지 않게
    channels: withDiscovered([
      ['EBSMath', 'UCP7KQPL8aAvMnRI_rGLwONA', 'ko'],
      ['쓸모있는 수학', 'UCNgC_RnWEi_NI-5vKMdGTFQ', 'ko'],
      ['12 Math', 'UCIeGcgo2NLHwYV5_NHuOwgg', 'ko'],
      ['enjoying math', 'UCWCeUXIAm_2skU3QwJJziNg', 'ko'],
      ['인공지능수학 깨봉', 'UCufMvGtKg2hoTs0h1Ti5cxg', 'ko'],
      ['Ray 수학', 'UCkzbCw-4lXOl4Gf-AOrI_gw', 'ko'],
    ], 'ko'),
  },
  {
    type: 'youtube-top',
    name: '유튜브 인기 (해외)',
    lang: 'en',
    category: '인기',
    limit: 18,
    maxAgeDays: 21,
    minViews: 30000,
    maxPerChannel: 2,
    channels: withDiscovered([
      ['Numberphile', 'UCoxcjq-8xIDTYp3uz647V5A', 'en'],
      ['Numberphile2', 'UCyp1gCHZJU_fGWFf2rtMkCg', 'en'],
      ['3Blue1Brown', 'UCYO_jab_esuFRV4b17AJtAw', 'en'],
      ['Stand-up Maths', 'UCSju5G2aFaWMqn-_0YBtq5A', 'en'],
      ['Mathologer', 'UC1_uAIS3r8Vu6JjXWvastJg', 'en'],
      ['blackpenredpen', 'UC_SvYP0k05UKiJ_2ndB02IA', 'en'],
      ['MindYourDecisions', 'UCHnj59g7jezwTy5GeL8EA_g', 'en'],
      ['Eddie Woo', 'UCq0EGvLTyy-LLT1oUSO_0FQ', 'en'],
      ['Mathemaniac', 'UCrlZs71h3mTR45FgQNINfrg', 'en'],
      ['Dr. Trefor Bazett', 'UC9rTsvTxJnx1DNrDA3Rqa6A', 'en'],
      ['The Math Sorcerer', 'UCr7lmzIk63PZnBw3bezl-Mg', 'en'],
    ], 'en'),
  },
]

export const youtubeFeed = youtube


// 인스타그램: 최근 게시물을 카드로 보여 줄 수학 계정 [계정, 언어]. scripts/collect-instagram.mjs 가 사용
// 팔로워 1만 명 이상만 싣습니다(수집할 때마다 확인). filter: 수학 외 내용도 올리는 계정 → 수학 관련 글만
export const MIN_FOLLOWERS = 10_000
export const INSTAGRAM_ACCOUNTS = [
  ['ebsmath', 'ko'],
  ['3blue1brown', 'en'],
  ['fermatslibrary', 'en'],
  ['mathvisualproofs', 'en'], // 그림으로 보는 증명
  ['mathletters', 'en'],
  ['geogebra', 'en'],
  ['desmosstudio', 'en'],
  ['standupmaths', 'en'],
  ['momath1', 'en'], // 미국 국립수학박물관
  ['amermathsoc', 'en'], // 미국수학회
  ['nctm.math', 'en'], // 전미수학교사협의회
  ['wolframresearch', 'en'],
  ['brilliantorg', 'en', { filter: true }],
  ['quantamag', 'en', { filter: true }],
]

// 페이스북: 최신 게시물을 카드로 보여 줄 수학 페이지 [주소 이름, 표시 이름, 언어]. scripts/collect-facebook.mjs 가 사용
export const FACEBOOK_PAGES = [
  ['numberphile', 'Numberphile', 'en'],
  ['3blue1brown', '3Blue1Brown', 'en'],
  ['OxfordMathematics', 'Oxford Mathematics', 'en'],
  ['geogebra', 'GeoGebra', 'en'],
  ['fermatslibrary', "Fermat's Library", 'en'],
  ['desmosinc', 'Desmos', 'en'],
  ['wolframresearch', 'Wolfram Research', 'en'],
  ['QuantaNews', 'Quanta Magazine', 'en', { filter: true }],
  ['brilliantorg', 'Brilliant', 'en', { filter: true }],
]

// 국내 기사: 제목에 반드시 포함해야 할 것 / 걸러낼 것
export const KO_REQUIRE = /수학|수능|필즈상|올림피아드|수리과학|고등과학원/
export const KO_EXCLUDE = /수학여행|수학 여행|연예인|포토뉴스/

// 해외 과학 매체는 수학과 무관한 기사가 섞여 있어 키워드로 한 번 더 거름
export const EN_REQUIRE = /\bmath|geometr|algebra|\bproof|theorem|conjecture|\bprime|statistic|topolog|equation|polyhedr|puzzle/i

// 기계 번역 기사 등 품질이 낮아 제외할 출처
export const BLOCKED_SOURCES = ['IDNFinancials', 'Vietnam.vn', 'Histoire pour Tous']

// 위에서부터 먼저 맞는 카테고리로 분류, 아무것도 안 맞으면 '교육'
export const KO_CATEGORIES = [
  ['입시', /수능|모의고사|모의평가|모평|입시|내신|대입|정시|수시|킬러/],
  ['AI·에듀테크', /AI|인공지능|에듀테크|디지털|챗GPT|코딩|로봇/i],
  ['대회·행사', /올림피아드|경시|대회|축제|체험전|페스티벌|캠프|박람회/],
  ['연구', /수학자|필즈상|증명|난제|연구|논문|학회|아벨상/],
]
