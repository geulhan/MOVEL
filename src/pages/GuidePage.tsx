import { useState, type ReactNode } from 'react'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingNav } from '../components/landing/LandingNav'
import { getMotionHubKakaoUrl } from '../constants/motionhub'
import {
  getMemberPortalUrl,
  MOTIONHUB_CENTER_GUIDE_URL,
  MOTIONHUB_SITE_URL,
} from '../constants/motionhubGuide'
import { useMotionHubGuideSeo } from '../hooks/useMotionHubSeo'

type GuideSection = {
  id: string
  step?: string
  title: string
  body: ReactNode
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'start',
    title: '시작하기',
    body: (
      <>
        <p className="text-base leading-relaxed text-charcoal/85">
          모션허브 가입을 축하드립니다.
        </p>
        <p className="mt-3 text-base leading-relaxed text-charcoal/75">
          아래 순서대로 설정하면 기본 운영을 시작할 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: 'center-info',
    step: '첫 번째',
    title: '센터 정보 확인',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-charcoal/80">
        <li>센터명 확인</li>
        <li>센터 코드 확인</li>
        <li>운영 기간 확인</li>
      </ul>
    ),
  },
  {
    id: 'admin-accounts',
    step: '두 번째',
    title: '관리자 계정 확인',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-charcoal/80">
        <li>대표 계정</li>
        <li>트레이너 계정</li>
        <li>권한 구분</li>
      </ul>
    ),
  },
  {
    id: 'member-register',
    step: '세 번째',
    title: '회원 등록',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-charcoal/80">
        <li>회원 이름</li>
        <li>휴대폰 번호</li>
        <li>수강권 정보</li>
        <li>만료일</li>
        <li>잔여횟수</li>
      </ul>
    ),
  },
  {
    id: 'payments',
    step: '네 번째',
    title: '결제 / 수강권 등록',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-charcoal/80">
        <li>PT 수강권</li>
        <li>필라테스 수강권</li>
        <li>요가 수강권</li>
        <li>GX 수강권</li>
        <li>시설이용권</li>
      </ul>
    ),
  },
  {
    id: 'schedule',
    step: '다섯 번째',
    title: '예약과 출석 관리',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-charcoal/80">
        <li>PT 예약</li>
        <li>그룹수업 예약</li>
        <li>출석 처리</li>
        <li>예약 변경</li>
        <li>예약 취소</li>
      </ul>
    ),
  },
  {
    id: 'alimtalk',
    step: '여섯 번째',
    title: '알림톡 설정',
    body: (
      <>
        <ul className="list-disc space-y-2 pl-5 text-charcoal/80">
          <li>회원가입 안내</li>
          <li>결제 완료 안내</li>
          <li>수업 리마인더</li>
          <li>잔여횟수 알림</li>
          <li>만료 안내</li>
          <li>주간 리포트</li>
        </ul>
        <p className="mt-4 rounded-lg border border-gold/25 bg-cream/50 px-4 py-3 text-sm leading-relaxed text-charcoal/75">
          현재 알림톡은 모션허브 공용 채널 기준으로 발송됩니다. 문구 안에 센터명이
          표시됩니다.
        </p>
      </>
    ),
  },
  {
    id: 'member-app',
    step: '일곱 번째',
    title: '회원앱 안내',
    body: (
      <>
        <p className="text-charcoal/80">
          회원에게 아래 주소를 안내할 수 있습니다.
        </p>
        <div className="mt-4 space-y-3">
          <a
            href={getMemberPortalUrl()}
            className="block break-all rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-sm font-medium text-motionhub-deep underline-offset-2 hover:underline"
          >
            {getMemberPortalUrl()}
          </a>
          <p className="text-sm text-charcoal/60">
            센터 코드가 필요한 경우
          </p>
          <code className="block break-all rounded-xl border border-charcoal/10 bg-cream/40 px-4 py-3 text-xs text-charcoal/80 sm:text-sm">
            {MOTIONHUB_SITE_URL}/member?center={'{센터코드}'}
          </code>
        </div>
      </>
    ),
  },
]

const FAQ_ITEMS = [
  {
    q: '회원이 직접 가입해야 하나요?',
    a: '센터에서 먼저 등록한 뒤 회원에게 로그인 안내를 보내는 방식을 추천합니다.',
  },
  {
    q: '알림톡은 센터 카카오채널로 나가나요?',
    a: 'MVP 단계에서는 모션허브 공용 채널로 발송됩니다. 문구 안에 센터명이 표시됩니다.',
  },
  {
    q: '베타 기간에는 비용이 발생하나요?',
    a: '베타 정책에 따라 안내합니다. 자세한 내용은 모션허브 카카오채널로 문의해 주세요.',
  },
] as const

function GuideAccordionItem({
  section,
  open,
  onToggle,
}: {
  section: GuideSection
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-4 px-5 py-5 text-left transition hover:bg-cream/30 sm:px-6"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-motionhub-light text-sm font-bold text-motionhub-deep">
          {open ? '−' : '+'}
        </span>
        <span className="min-w-0 flex-1">
          {section.step ? (
            <span className="text-xs font-bold uppercase tracking-wide text-gold-dark">
              {section.step}
            </span>
          ) : null}
          <span className="mt-1 block text-base font-bold text-charcoal sm:text-lg">
            {section.title}
          </span>
        </span>
      </button>
      {open ? (
        <div className="border-t border-charcoal/8 px-5 pb-6 pt-2 sm:px-6">
          <div className="pl-12">{section.body}</div>
        </div>
      ) : null}
    </div>
  )
}

export default function GuidePage() {
  useMotionHubGuideSeo()
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(['start', 'center-info']),
  )
  const kakaoUrl = getMotionHubKakaoUrl()

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-cream">
      <LandingNav activePage="guide" />
      <main className="pt-20">
        <section className="border-b border-charcoal/8 bg-motionhub-deep py-14 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-widest text-motionhub">
              Center Guide
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-cream sm:text-4xl">
              모션허브 시작 가이드
            </h1>
            <p className="mt-4 text-base leading-relaxed text-cream/70">
              센터 대표 · 센터 관리자 · 프리랜서 트레이너를 위한 초기 설정 안내입니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/login"
                className="rounded-xl bg-motionhub px-6 py-3.5 text-center text-sm font-bold text-charcoal transition hover:bg-motionhub-dark"
              >
                관리자 로그인
              </a>
              <a
                href="/signup"
                className="rounded-xl border border-cream/25 bg-cream/5 px-6 py-3.5 text-center text-sm font-bold text-cream transition hover:border-cream/40 hover:bg-cream/10"
              >
                센터 등록
              </a>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl space-y-4 px-4 sm:px-6">
            {GUIDE_SECTIONS.map((section) => (
              <GuideAccordionItem
                key={section.id}
                section={section}
                open={openIds.has(section.id)}
                onToggle={() => toggle(section.id)}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-charcoal/8 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-xl font-bold text-charcoal sm:text-2xl">
              자주 묻는 질문
            </h2>
            <div className="mt-6 space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-charcoal/10 bg-cream/30 px-5 py-5 sm:px-6"
                >
                  <p className="font-semibold text-charcoal">Q. {item.q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal/75 sm:text-base">
                    A. {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-charcoal/8 bg-motionhub-deep py-14 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-xl font-bold text-cream sm:text-2xl">문의</h2>
            <p className="mt-3 text-sm text-cream/65 sm:text-base">
              설정 중 궁금한 점이 있으면 모션허브 카카오채널로 문의해 주세요.
            </p>
            <a
              href={kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex rounded-xl bg-motionhub px-8 py-3.5 text-sm font-bold text-charcoal transition hover:bg-motionhub-dark"
            >
              모션허브 카카오채널 문의
            </a>
            <p className="mt-6 break-all text-xs text-cream/40">
              가이드 URL: {MOTIONHUB_CENTER_GUIDE_URL}
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
