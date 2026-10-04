// 수집 대상 목록. 여기에 항목을 추가/삭제하면 다음 수집부터 반영됩니다.
// type: bing(빙 뉴스 검색) | rss(일반 RSS/Atom) | youtube(채널 최신) | youtube-top(여러 채널 중 조회수 상위)
// category 를 적으면 키워드 분류 대신 그 카테고리로 고정

// qft=sortbydate="1": 관련도순이 아니라 최신순으로 받아 방금 나온 기사부터 수집
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
  { type: 'rss', lang: 'en', name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', requireCategory: 'Mathematics', limit: 3, maxAgeDays: 14 },
  { type: 'rss', lang: 'en', name: 'Phys.org', url: 'https://phys.org/rss-feed/science-news/mathematics/', limit: 3, maxAgeDays: 7 },
  { type: 'rss', lang: 'en', name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/computers_math/mathematics.xml', limit: 3, maxAgeDays: 7 },
  { type: 'rss', lang: 'en', name: 'Plus Magazine', url: 'https://plus.maths.org/content/rss.xml', limit: 2, maxAgeDays: 30 },

  // 미국 수학 단체: NCTM(전미수학교사협의회) 학술지 MTLT, AMS(미국수학회) 소식·칼럼.
  // (MAA 는 자동 접속을 차단(403)해서 제외)
  // trusted: 수학 전문 매체라 키워드 필터를 건너뜀
  { type: 'rss', lang: 'en', name: 'NCTM', trusted: true, url: 'https://pubs.nctm.org/journalissuetocrss/journals/mtlt/mtlt-overview.xml', limit: 4, maxAgeDays: 45 },
  { type: 'rss', lang: 'en', name: 'AMS', trusted: true, url: 'https://www.ams.org/cgi-bin/content/news_items.cgi?rss=1', limit: 3, maxAgeDays: 30 },
  { type: 'rss', lang: 'en', name: 'AMS Feature Column', trusted: true, url: 'https://mathvoices.ams.org/featurecolumn/feed/', limit: 2, maxAgeDays: 45 },

  // SNS 인기 게시물: 수학 유튜브 채널들의 최근 2주 영상 중 조회수 상위
  {
    type: 'youtube-top',
    lang: 'en',
    category: '인기',
    limit: 14,
    maxAgeDays: 14,
    minViews: 5000, // 이 조회수 미만이면 '인기'로 치지 않음
    channels: [
      ['EBSMath', 'UCP7KQPL8aAvMnRI_rGLwONA', 'ko'],
      ['쓸모있는 수학', 'UCNgC_RnWEi_NI-5vKMdGTFQ', 'ko'],
      ['12 Math', 'UCIeGcgo2NLHwYV5_NHuOwgg', 'ko'],
      ['enjoying math', 'UCWCeUXIAm_2skU3QwJJziNg', 'ko'],
      ['Numberphile', 'UCoxcjq-8xIDTYp3uz647V5A', 'en'],
      ['3Blue1Brown', 'UCYO_jab_esuFRV4b17AJtAw', 'en'],
      ['Stand-up Maths', 'UCSju5G2aFaWMqn-_0YBtq5A', 'en'],
      ['Mathologer', 'UC1_uAIS3r8Vu6JjXWvastJg', 'en'],
      ['인공지능수학 깨봉', 'UCufMvGtKg2hoTs0h1Ti5cxg', 'ko'],
      ['Numberphile2', 'UCyp1gCHZJU_fGWFf2rtMkCg', 'en'],
      ['blackpenredpen', 'UC_SvYP0k05UKiJ_2ndB02IA', 'en'],
      ['MindYourDecisions', 'UCHnj59g7jezwTy5GeL8EA_g', 'en'],
      ['Eddie Woo', 'UCq0EGvLTyy-LLT1oUSO_0FQ', 'en'],
      ['Mathemaniac', 'UCrlZs71h3mTR45FgQNINfrg', 'en'],
      ['Dr. Trefor Bazett', 'UC9rTsvTxJnx1DNrDA3Rqa6A', 'en'],
      ['The Math Sorcerer', 'UCr7lmzIk63PZnBw3bezl-Mg', 'en'],
    ],
  },

  // 유튜브 채널 최신 영상
  { type: 'youtube', lang: 'en', name: 'Numberphile', url: youtube('UCoxcjq-8xIDTYp3uz647V5A'), limit: 2, maxAgeDays: 30 },
  { type: 'youtube', lang: 'en', name: '3Blue1Brown', url: youtube('UCYO_jab_esuFRV4b17AJtAw'), limit: 2, maxAgeDays: 60 },
  { type: 'youtube', lang: 'ko', name: 'EBSMath', url: youtube('UCP7KQPL8aAvMnRI_rGLwONA'), limit: 2, maxAgeDays: 30 },
  { type: 'youtube', lang: 'ko', name: '쓸모있는 수학', url: youtube('UCNgC_RnWEi_NI-5vKMdGTFQ'), limit: 2, maxAgeDays: 30 },
  { type: 'youtube', lang: 'ko', name: '인공지능수학 깨봉', url: youtube('UCufMvGtKg2hoTs0h1Ti5cxg'), limit: 2, maxAgeDays: 30 },
  { type: 'youtube', lang: 'en', name: 'Stand-up Maths', url: youtube('UCSju5G2aFaWMqn-_0YBtq5A'), limit: 1, maxAgeDays: 30 },
  { type: 'youtube', lang: 'en', name: 'blackpenredpen', url: youtube('UC_SvYP0k05UKiJ_2ndB02IA'), limit: 1, maxAgeDays: 14 },
  { type: 'youtube', lang: 'en', name: 'MindYourDecisions', url: youtube('UCHnj59g7jezwTy5GeL8EA_g'), limit: 1, maxAgeDays: 14 },
  { type: 'youtube', lang: 'en', name: 'Dr. Trefor Bazett', url: youtube('UC9rTsvTxJnx1DNrDA3Rqa6A'), limit: 1, maxAgeDays: 14 },
  { type: 'youtube', lang: 'en', name: 'Eddie Woo', url: youtube('UCq0EGvLTyy-LLT1oUSO_0FQ'), limit: 1, maxAgeDays: 30 },
]

export const youtubeFeed = youtube

// 인스타그램: 최근 게시물을 카드로 보여 줄 수학 계정 [계정, 언어]. scripts/collect-instagram.mjs 가 사용
export const INSTAGRAM_ACCOUNTS = [
  ['ebsmath', 'ko'],
  ['3blue1brown', 'en'],
  ['fermatslibrary', 'en'],
  ['geogebra', 'en'],
  ['standupmaths', 'en'],
]

// 페이스북: 최신 게시물을 카드로 보여 줄 수학 페이지 [주소 이름, 표시 이름, 언어]. scripts/collect-facebook.mjs 가 사용
export const FACEBOOK_PAGES = [
  ['numberphile', 'Numberphile', 'en'],
  ['QuantaNews', 'Quanta Magazine', 'en'],
  ['geogebra', 'GeoGebra', 'en'],
  ['fermatslibrary', "Fermat's Library", 'en'],
]

// 국내 기사: 제목에 반드시 포함해야 할 것 / 걸러낼 것
export const KO_REQUIRE = /수학|수능|필즈상|올림피아드/
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
