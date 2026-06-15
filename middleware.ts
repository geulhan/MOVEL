import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * motionhub.kr 루트(/) 요청 시 Vercel filesystem이 index.html을 먼저 내려주는 문제를 방지.
 * 크롤러·카카오 OG는 / 에서 motionhub.html 정적 메타가 필요합니다.
 */
export function middleware(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    ''
  const hostname = host.split(',')[0].split(':')[0].trim().toLowerCase()

  if (hostname === 'motionhub.kr' || hostname === 'www.motionhub.kr') {
    const url = request.nextUrl.clone()
    url.pathname = '/motionhub.html'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!assets/|logo/|motionhub-og\\.png|favicon\\.ico|.*\\.[\\w]+$).*)',
  ],
}
