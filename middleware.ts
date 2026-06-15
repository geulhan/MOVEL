import { next, rewrite } from '@vercel/functions'

const MOTIONHUB_HOSTS = new Set(['motionhub.kr', 'www.motionhub.kr'])

function isStaticAsset(pathname: string): boolean {
  if (pathname === '/motionhub-og.png' || pathname === '/motionhub.html') {
    return true
  }
  if (pathname.startsWith('/assets/') || pathname.startsWith('/logo/')) {
    return true
  }
  return /\.[a-zA-Z0-9]+$/.test(pathname)
}

/**
 * motionhub.kr 루트(/)는 dist/index.html이 filesystem에서 먼저 매칭됩니다.
 * Edge Middleware에서 motionhub.html로 rewrite해야 OG 메타가 크롤러에 노출됩니다.
 */
export default function middleware(request: Request) {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()

  if (!MOTIONHUB_HOSTS.has(host)) {
    return next()
  }

  const { pathname } = new URL(request.url)
  if (isStaticAsset(pathname)) {
    return next()
  }

  return rewrite(new URL('/motionhub.html', request.url))
}

export const config = {
  matcher: ['/((?!assets/|logo/|motionhub-og\\.png).*)'],
}
