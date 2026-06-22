import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingNav } from '../components/landing/LandingNav'
import {
  LandingContainer,
  PrimaryButton,
  SecondaryButton,
  SectionEyebrow,
  SectionTitle,
} from '../components/landing/landingPrimitives'
import { getMotionHubKakaoUrl } from '../constants/motionhub'
import {
  getMemberPortalUrl,
  MOTIONHUB_CENTER_GUIDE_URL,
  MOTIONHUB_MEMBER_SIGNUP_PORTAL_URL,
} from '../constants/motionhubGuide'
import { MOTIONHUB_SITE_URL } from '../constants/motionhubSeo'
import { useMotionHubGuideSeo } from '../hooks/useMotionHubSeo'

const QUICK_START = [
  {
    step: 1,
    title: '회원 등록',
    desc: '회원 추가 및 기본정보 입력',
  },
  {
    step: 2,
    title: '수강권 등록',
    desc: 'PT / 필라테스 / 요가 / GX',
  },
  {
    step: 3,
    title: '예약 생성',
    desc: 'PT 및 그룹수업 예약 생성',
  },
] as const

type AccordionItem = {
  id: string
  title: string
  body: ReactNode
}

const GUIDE_ACCORDION: AccordionItem[] = [
  {
    id: 'member',
    title: '회원 등록',
    body: (
      <ul className="landing-guide-list">
        <li>회원 이름 · 휴대폰 번호 입력</li>
        <li>수강권 정보 · 만료일 · 잔여횟수 확인</li>
        <li>등록 후 회원에게 로그인 안내 발송</li>
      </ul>
    ),
  },
  {
    id: 'pass',
    title: '수강권 등록',
    body: (
      <p className="landing-guide-text">
        PT · 필라테스 · 요가 · GX · 시설이용권 등 센터 운영 형태에 맞는 수강권을
        등록합니다. 결제와 연동하면 자동 알림톡이 발송됩니다.
      </p>
    ),
  },
  {
    id: 'schedule',
    title: '예약 생성',
    body: (
      <ul className="landing-guide-list">
        <li>PT · 그룹수업 예약 일정 생성</li>
        <li>출석 처리 · 예약 변경 · 취소</li>
      </ul>
    ),
  },
  {
    id: 'attendance',
    title: '출석 관리',
    body: (
      <ul className="landing-guide-list">
        <li>당일 수업 출석 처리</li>
        <li>잔여 횟수 · 만료일 자동 반영</li>
      </ul>
    ),
  },
  {
    id: 'alimtalk',
    title: '알림톡 설정',
    body: (
      <>
        <ul className="landing-guide-list">
          <li>회원가입 안내 · 결제 완료</li>
          <li>수업 리마인더 · 잔여횟수 · 만료 안내</li>
        </ul>
        <p className="landing-guide-callout">
          알림톡은 모션허브 공용 채널로 발송되며, 문구에 센터명이 표시됩니다.
        </p>
      </>
    ),
  },
  {
    id: 'member-app',
    title: '회원앱 안내',
    body: (
      <div className="space-y-3">
        <p className="landing-guide-text">회원에게 아래 주소를 안내해 주세요.</p>
        <a
          href={getMemberPortalUrl()}
          className="block break-all rounded-xl border border-charcoal/10 bg-motionhub-light/40 px-4 py-3 text-sm font-semibold text-motionhub-deep transition hover:border-motionhub/30"
        >
          {MOTIONHUB_MEMBER_SIGNUP_PORTAL_URL}
        </a>
        <p className="text-xs leading-relaxed text-charcoal/50">
          센터 코드: {MOTIONHUB_SITE_URL}/member?center={'{센터코드}'}
        </p>
      </div>
    ),
  },
]

const FAQ_ITEMS = [
  {
    q: '회원이 직접 가입해야 하나요?',
    a: '센터에서 먼저 등록한 뒤, 회원에게 로그인 안내를 보내는 방식을 추천합니다.',
  },
  {
    q: '알림톡은 센터 카카오채널로 나가나요?',
    a: '현재는 모션허브 공용 채널로 발송됩니다. 문구 안에 센터명이 표시됩니다.',
  },
  {
    q: '베타 기간 비용은 어떻게 되나요?',
    a: '베타 정책에 따라 안내드립니다. 모션허브 카카오채널로 문의해 주세요.',
  },
] as const

function GuideAccordion({
  items,
  defaultOpen,
}: {
  items: AccordionItem[]
  defaultOpen?: string
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen ?? null)

  return (
    <div className="divide-y divide-charcoal/8 overflow-hidden rounded-2xl border border-charcoal/8 bg-white shadow-sm">
      {items.map((item) => {
        const open = openId === item.id
        return (
          <div key={item.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-cream/40 sm:px-6"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span className="text-base font-bold text-charcoal sm:text-lg">
                {item.title}
              </span>
              <span
                className={`text-motionhub transition ${open ? 'rotate-180' : ''}`}
                aria-hidden
              >
                ▾
              </span>
            </button>
            {open ? (
              <div className="border-t border-charcoal/6 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                {item.body}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default function GuidePage() {
  useMotionHubGuideSeo()
  const kakaoUrl = getMotionHubKakaoUrl()

  const faqAccordion: AccordionItem[] = FAQ_ITEMS.map((item) => ({
    id: item.q,
    title: item.q,
    body: <p className="landing-guide-text">{item.a}</p>,
  }))

  return (
    <div className="min-h-screen bg-surface">
      <LandingNav activePage="guide" />
      <main className="pt-[3.75rem]">
        <section className="landing-hero-mesh border-b border-white/[0.06] py-14 sm:py-18">
          <LandingContainer className="text-center">
            <SectionEyebrow light centered>
              Quick Start
            </SectionEyebrow>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-cream sm:text-4xl lg:text-5xl">
              모션허브 시작 가이드
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-cream/70 sm:text-lg">
              운동센터 운영을
              <br className="sm:hidden" />
              <span className="font-semibold text-motionhub"> 5분 안에</span> 시작해
              보세요.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryButton to="/login">관리자 로그인</PrimaryButton>
              <SecondaryButton to="/signup">센터 등록</SecondaryButton>
            </div>
          </LandingContainer>
        </section>

        <section className="bg-white py-14 sm:py-16">
          <LandingContainer>
            <div className="landing-section-centered">
              <SectionEyebrow centered>모션허브 시작하기</SectionEyebrow>
              <SectionTitle centered className="text-2xl sm:text-3xl">
                3단계면 운영을 시작할 수 있습니다
              </SectionTitle>
              <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-charcoal/60 sm:text-base">
                회원 등록 → 수강권 등록 → 예약 생성만 완료하면 기본 운영이
                가능합니다.
              </p>
            </div>

            <div className="mx-auto mt-10 flex max-w-4xl flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:gap-3">
              {QUICK_START.map((item, idx) => (
                <div key={item.step} className="flex flex-1 flex-col items-center gap-4 lg:flex-row">
                  <article className="landing-card w-full flex-1 p-6 text-center">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-motionhub text-sm font-bold text-charcoal">
                      {item.step}
                    </span>
                    <h2 className="mt-4 text-lg font-bold text-charcoal">{item.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-charcoal/60">
                      {item.desc}
                    </p>
                  </article>
                  {idx < QUICK_START.length - 1 ? (
                    <span
                      className="hidden shrink-0 text-2xl text-motionhub/50 lg:block"
                      aria-hidden
                    >
                      →
                    </span>
                  ) : null}
                  {idx < QUICK_START.length - 1 ? (
                    <span
                      className="text-xl text-motionhub/40 lg:hidden"
                      aria-hidden
                    >
                      ↓
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </LandingContainer>
        </section>

        <section className="bg-[#f7f3ec] py-14 sm:py-16">
          <LandingContainer>
            <div className="landing-section-centered mb-8">
              <SectionEyebrow centered>Detail</SectionEyebrow>
              <SectionTitle centered className="text-2xl sm:text-3xl">
                상세 가이드
              </SectionTitle>
            </div>
            <div className="mx-auto max-w-3xl">
              <GuideAccordion items={GUIDE_ACCORDION} defaultOpen="member" />
            </div>
          </LandingContainer>
        </section>

        <section className="border-y border-charcoal/8 bg-white py-14 sm:py-16">
          <LandingContainer>
            <div className="landing-section-centered mb-8">
              <SectionEyebrow centered>FAQ</SectionEyebrow>
              <SectionTitle centered className="text-2xl sm:text-3xl">
                자주 묻는 질문
              </SectionTitle>
            </div>
            <div className="mx-auto max-w-3xl">
              <GuideAccordion items={faqAccordion} />
            </div>
          </LandingContainer>
        </section>

        <section className="landing-hero-mesh py-14 sm:py-16">
          <LandingContainer className="text-center">
            <h2 className="text-xl font-bold text-cream sm:text-2xl">문의</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream/65 sm:text-base">
              설정 중 궁금한 점은 모션허브 카카오채널로 편하게 문의해 주세요.
            </p>
            <div className="mt-8">
              <a
                href={kakaoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-primary"
              >
                카카오채널 문의
              </a>
              <p className="mt-5 break-all text-xs text-cream/40">
                {MOTIONHUB_CENTER_GUIDE_URL}
              </p>
            </div>
            <Link
              to="/"
              className="mt-6 inline-block text-sm font-semibold text-cream/55 underline-offset-4 hover:text-cream hover:underline"
            >
              랜딩으로 돌아가기
            </Link>
          </LandingContainer>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
