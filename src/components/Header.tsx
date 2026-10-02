import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Header() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navigation = [
    { name: '릴스', href: '/' },
    { name: '포털', href: '/portal' },
    { name: '뉴스', href: '/news' },
    { name: '자료실', href: '/board' },
    { name: '공지사항', href: '/notice' },
    { name: '크롤링', href: '/admin/crawl' },
  ]

  const isActive = (path: string) => {
    return router.pathname === path
  }

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/portal" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-primary-600">
              🧮 Shrek Math News
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-gray-700 hover:text-primary-600 transition-colors ${
                  isActive(item.href) ? 'text-primary-600 font-semibold' : ''
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              회원가입
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block py-2 text-gray-700 hover:text-primary-600 transition-colors ${
                  isActive(item.href) ? 'text-primary-600 font-semibold' : ''
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-200 space-y-2">
              <Link
                href="/login"
                className="block py-2 text-gray-700 hover:text-primary-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="block py-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                회원가입
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

