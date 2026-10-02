import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Layout from '@/components/Layout'

export default function App({ Component, pageProps }: AppProps) {
  // 릴스처럼 화면 전체를 쓰는 페이지는 공통 헤더/푸터 없이 렌더링
  if ((Component as any).fullscreen) {
    return <Component {...pageProps} />
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}

