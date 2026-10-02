# Shrek Math News 🧮

수학 교사를 위한 수학 뉴스 릴스 + 자료·커뮤니티 포털입니다.

## 수학 릴스 (메인 화면)

하루 2번(07:00 · 14:00) 수학 뉴스를 수집해 섬네일·번역이 붙은 릴스/카드뉴스 형태로 보여주고, GitHub Pages 에 자동 배포합니다. 실행 방법과 구조는 [수학릴스-안내.md](수학릴스-안내.md) 를 보세요.

```bash
npm run local   # 사이트 실행 + 자동 수집
```

## 주요 기능

- 📰 **뉴스 피드**: 국내외 수학 관련 뉴스를 실시간으로 제공
- 📚 **자료실**: 학습자료, 강의노트, 기출문제 등을 공유
- 👥 **커뮤니티**: 교사, 학생, 연구자들이 소통하는 공간
- 🔔 **공지사항**: 대회 일정, 이벤트 정보 제공
- 👤 **회원 시스템**: 안전한 로그인 및 프로필 관리

## 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes (향후 Firebase/MongoDB 연동 예정)
- **Auth**: Firebase Auth (향후 구현)
- **Deployment**: Vercel

## 로컬 실행 방법

### 1. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 2. 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 3. 빌드 및 프로덕션 실행

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 프로젝트 구조

```
math-insight-hub/
├── src/
│   ├── components/        # 재사용 가능한 컴포넌트
│   │   ├── Layout.tsx     # 전체 레이아웃
│   │   ├── Header.tsx     # 헤더 (네비게이션)
│   │   └── Footer.tsx     # 푸터
│   ├── pages/             # Next.js 페이지 라우팅
│   │   ├── index.tsx      # 홈 페이지
│   │   ├── news/          # 뉴스 페이지
│   │   ├── board/         # 자료실 페이지
│   │   ├── notice/        # 공지사항 페이지
│   │   ├── login.tsx      # 로그인 페이지
│   │   ├── signup.tsx     # 회원가입 페이지
│   │   ├── _app.tsx       # Next.js 앱 설정
│   │   └── _document.tsx  # HTML 문서 설정
│   └── styles/
│       └── globals.css    # 전역 스타일
├── public/                # 정적 파일
├── package.json           # 의존성 관리
├── tsconfig.json          # TypeScript 설정
├── tailwind.config.js     # Tailwind CSS 설정
└── next.config.js         # Next.js 설정
```

## 페이지 구성

- **홈 (/)**: 최신 뉴스, 인기 게시글, 대회 일정을 한눈에
- **뉴스 (/news)**: 카테고리별 수학 뉴스 제공
- **자료실 (/board)**: 학습자료 및 질문 게시판
- **공지사항 (/notice)**: 중요 공지 및 이벤트 정보
- **로그인 (/login)**: 회원 로그인
- **회원가입 (/signup)**: 신규 회원 가입

## 향후 개발 계획

### Phase 1 (현재)
- ✅ 기본 UI/UX 구현
- ✅ 페이지 라우팅
- ✅ 반응형 디자인

### Phase 2
- 🔄 Firebase 연동 (인증, DB, 스토리지)
- 🔄 실제 뉴스 크롤링 기능
- 🔄 게시글 작성/수정/삭제 기능
- 🔄 댓글 시스템

### Phase 3
- 📋 관리자 페이지
- 📋 파일 업로드/다운로드
- 📋 검색 기능 고도화
- 📋 알림 시스템

### Phase 4
- 📋 소셜 로그인 (Google, Kakao)
- 📋 이메일 알림
- 📋 RSS 피드 구독
- 📋 모바일 앱 (React Native)

## 개발 가이드

### 새로운 페이지 추가하기

1. `src/pages/` 폴더에 새 파일 생성 (예: `mypage.tsx`)
2. React 컴포넌트 작성
3. Next.js가 자동으로 라우팅 처리

### 새로운 컴포넌트 추가하기

1. `src/components/` 폴더에 새 파일 생성
2. 재사용 가능한 컴포넌트 작성
3. 필요한 곳에서 import하여 사용

### 스타일링

- Tailwind CSS 유틸리티 클래스 사용
- 커스텀 색상은 `tailwind.config.js`에서 설정
- 전역 스타일은 `src/styles/globals.css`에 작성

## 배포

### Vercel 배포 (권장)

1. GitHub 저장소에 코드 푸시
2. [Vercel](https://vercel.com)에 로그인
3. 프로젝트 import
4. 자동 빌드 및 배포 완료

### 환경 변수 설정

향후 Firebase 등을 연동할 때 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

## 라이선스

MIT License

## 기여

Pull Request와 Issue는 언제나 환영합니다!

## 문의

- 이메일: contact@mathinsight.hub
- GitHub: [프로젝트 저장소]

---

© 2025 Math Insight Hub. All rights reserved.

