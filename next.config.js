/** @type {import('next').NextConfig} */
// STATIC_EXPORT=1 이면 GitHub Pages 용 정적 사이트(out/)로 빌드.
// BASE_PATH 는 저장소 이름 (예: /math-insight-hub) — 배포 워크플로가 넣어 줌.
const nextConfig = {
  reactStrictMode: true,
  output: process.env.STATIC_EXPORT ? 'export' : undefined,
  basePath: process.env.BASE_PATH || '',
  trailingSlash: Boolean(process.env.STATIC_EXPORT),
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
