import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { fetchCenterPublicInfo } from '../api/centerPublic'
import { getMemberSession } from '../api/memberPortal'
import { MemberAppMockPreview } from '../components/member/MemberAppMockPreview'
import { MemberLayout } from '../components/layouts/MemberLayout'
import { resolveMemberCenterSlugFromUrl } from '../lib/centerSlug'
import { btnGold, btnOutline, cardClass } from '../styles/theme'

const QUICK_STEPS = [
  '예약 확인',
  '출석 확인',
  '운동기록 작성',
] as const

function buildMemberPortalHref(centerSlug: string, mode: 'signup' | 'login'): string {
  const params = new URLSearchParams()
  if (centerSlug) params.set('center', centerSlug)
  params.set('mode', mode)
  return `/member?${params.toString()}`
}

export default function MemberWelcomePage() {
  const [searchParams] = useSearchParams()
  const centerSlug = resolveMemberCenterSlugFromUrl(searchParams.get('center'))
  const [centerName, setCenterName] = useState<string | null>(null)

  const signupHref = useMemo(
    () => buildMemberPortalHref(centerSlug, 'signup'),
    [centerSlug],
  )
  const loginHref = useMemo(
    () => buildMemberPortalHref(centerSlug, 'login'),
    [centerSlug],
  )

  const loggedInMemberId = getMemberSession()
  const loggedInRedirect = loggedInMemberId
    ? `/member${centerSlug ? `?center=${encodeURIComponent(centerSlug)}` : ''}`
    : null

  useEffect(() => {
    if (!centerSlug) {
      setCenterName(null)
      return
    }
    let cancelled = false
    void fetchCenterPublicInfo(centerSlug)
      .then((info) => {
        if (!cancelled) setCenterName(info?.centerName ?? null)
      })
      .catch(() => {
        if (!cancelled) setCenterName(null)
      })
    return () => {
      cancelled = true
    }
  }, [centerSlug])

  if (loggedInRedirect) {
    return <Navigate to={loggedInRedirect} replace />
  }

  const greetingCenter = centerName ?? (centerSlug ? centerSlug : '센터')

  return (
    <MemberLayout>
      <div className="mx-auto max-w-lg space-y-5 pb-8">
        <section className="px-1 pt-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">
            모션허브 시작하기
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-charcoal/80">
            <span className="font-semibold text-charcoal">{greetingCenter}</span> 회원 등록이
            완료되었습니다.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            예약 · 출석 · 운동기록 · 수강권 확인을 한 곳에서 관리할 수 있습니다.
          </p>
        </section>

        <section className={`${cardClass} px-4 py-4`}>
          <p className="text-center text-xs font-bold uppercase tracking-wide text-gold-dark">
            30초 사용법
          </p>
          <ol className="mt-3 space-y-2">
            {QUICK_STEPS.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-lg bg-cream/60 px-3 py-2 text-sm text-charcoal"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-motionhub text-xs font-bold text-white">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-center text-xs font-semibold text-charcoal/70">끝</p>
        </section>

        <MemberAppMockPreview />

        <section className="space-y-3 px-1">
          <Link to={signupHref} className={`block w-full text-center ${btnGold}`}>
            회원가입
          </Link>
          <Link
            to={loginHref}
            className={`block w-full text-center ${btnOutline}`}
          >
            로그인
          </Link>
          <p className="text-center text-xs text-muted">
            관리자 등록 회원의 초기 비밀번호는 휴대폰 뒤 4자리입니다.
          </p>
        </section>
      </div>
    </MemberLayout>
  )
}
