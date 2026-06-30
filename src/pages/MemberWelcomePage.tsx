import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { fetchCenterPublicInfo } from '../api/centerPublic'
import { getMemberSession } from '../api/memberPortal'
import { MemberAppMockPreview } from '../components/member/MemberAppMockPreview'
import { MemberLayout } from '../components/layouts/MemberLayout'
import { MEMBER_WELCOME_JOURNEY } from '../lib/memberOnboardingFlow'
import { resolveMemberCenterSlugFromUrl } from '../lib/centerSlug'
import { btnGold, btnOutline } from '../styles/theme'

const softCardClass =
  'rounded-2xl border border-charcoal/12 bg-[#e8ecf1] shadow-sm shadow-charcoal/8'

function buildMemberPortalHref(
  centerSlug: string,
  mode: 'signup' | 'login',
  onboarding = true,
): string {
  const params = new URLSearchParams()
  if (centerSlug) params.set('center', centerSlug)
  params.set('mode', mode)
  if (onboarding) params.set('onboarding', '1')
  return `/member?${params.toString()}`
}

export default function MemberWelcomePage() {
  const [searchParams] = useSearchParams()
  const centerSlug = resolveMemberCenterSlugFromUrl(searchParams.get('center'))
  const [centerName, setCenterName] = useState<string | null>(null)

  const loginHref = useMemo(
    () => buildMemberPortalHref(centerSlug, 'login'),
    [centerSlug],
  )
  const signupHref = useMemo(
    () => buildMemberPortalHref(centerSlug, 'signup'),
    [centerSlug],
  )

  const loggedInMemberId = getMemberSession()
  const loggedInRedirect = loggedInMemberId
    ? `/member?${new URLSearchParams({
        ...(centerSlug ? { center: centerSlug } : {}),
        onboarding: '1',
      }).toString()}`
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
    <MemberLayout appearance="soft">
      <div className="mx-auto max-w-lg space-y-5 pb-8">
        <section className="px-1 pt-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
            회원 안내
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-charcoal/95">
            모션허브 시작하기
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-charcoal/75">
            <span className="font-semibold text-charcoal/90">{greetingCenter}</span> 회원 등록이
            완료되었습니다.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/60">
            아래 순서대로 진행하면 별도 설명 없이 바로 이용할 수 있습니다.
          </p>
        </section>

        <section className={`${softCardClass} px-4 py-4`}>
          <p className="text-center text-xs font-bold uppercase tracking-wide text-charcoal/50">
            이용 순서
          </p>
          <ol className="mt-3 space-y-2">
            {MEMBER_WELCOME_JOURNEY.map((step, index) => (
              <li
                key={step.label}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                  step.doneOnWelcome
                    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                    : 'border-charcoal/8 bg-[#dfe5ec] text-charcoal/85'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.doneOnWelcome
                      ? 'bg-emerald-600 text-white'
                      : 'bg-charcoal/80 text-motionhub'
                  }`}
                >
                  {step.doneOnWelcome ? '✓' : index + 1}
                </span>
                {step.label}
              </li>
            ))}
          </ol>
        </section>

        <MemberAppMockPreview />

        <section className="space-y-3 px-1">
          <Link to={loginHref} className={`block w-full text-center ${btnGold}`}>
            로그인하고 시작하기
          </Link>
          <p className="text-center text-xs text-charcoal/55">
            아이디: 휴대폰 번호 · 비밀번호: <strong>뒤 4자리</strong>
          </p>
          <Link
            to={signupHref}
            className={`block w-full text-center ${btnOutline} !border-charcoal/20 !bg-[#e8ecf1] hover:!bg-[#eef2f6]`}
          >
            직접 회원가입
          </Link>
        </section>
      </div>
    </MemberLayout>
  )
}
