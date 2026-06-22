import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingNav } from '../components/landing/LandingNav'
import {
  LandingContainer,
  PrimaryButton,
  SecondaryButton,
  SectionEyebrow,
  SectionLead,
  SectionTitle,
} from '../components/landing/landingPrimitives'
import { getMotionHubKakaoUrl } from '../constants/motionhub'
import {
  getMemberPortalUrl,
  MOTIONHUB_CENTER_GUIDE_PATH,
} from '../constants/motionhubGuide'
import { MOTIONHUB_SITE_URL } from '../constants/motionhubSeo'
import { useMotionHubGuideSeo } from '../hooks/useMotionHubSeo'

function GuideList({ items }: { items: string[] }) {
  return (
    <ul className="landing-guide-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

type GuideStep = {
  n: number
  title: string
  body: ReactNode
}

const STEPS: GuideStep[] = [
  {
    n: 0,
    title: '시작하기',
    body: (
      <p className="landing-guide-text">
        모션허브 가입을 축하드립니다. 아래 순서대로 설정하면 기본 운영을 시작할 수 있습니다.
      </p>
    ),
  },
  {
    n: 1,
    title: '센터 정보 확인',
    body: (
      <GuideList
        items={['센터명 확인', '센터 코드 확인', '운영 기간 확인']}
      />
    ),
  },
  {
    n: 2,
    title: '관리자 계정 확인',
    body: (
      <GuideList
        items={['대표 계정', '트레이너 계정', '권한 구분']}
      />
    ),
  },
  {
    n: 3,
    title: '회원 등록',
    body: (
      <GuideList
        items={[
          '회원 이름 · 휴대폰 번호',
          '수강권 정보 · 만료일 · 잔여횟수',
        ]}
      />
    ),
  },
  {
    n: 4,
    title: '결제 / 수강권 등록',
    body: (
      <p className="landing-guide-text">
        PT · 필라테스 · 요가 · GX · 시설이용권 등 센터 운영 형태에 맞는 수강권을 등록합니다.
      </p>
    ),
  },
  {
    n: 5,
    title: '예약과 출석 관리',
    body: (
      <GuideList
        items={[
          'PT · 그룹수업 예약',
          '출석 처리 · 예약 변경 · 취소',
        ]}
      />
    ),
  },
  {
    n: 6,
    title: '알림톡',
    body: (
      <>
        <GuideList
          items={[
            '회원가입 안내 · 결제 완료',
            '수업 리마인더 · 잔여횟수 · 만료 안내',
          ]}
        />
        <p className="landing-guide-callout">
          알림톡은 모션허브 공용 채널로 발송되며, 문구에 센터명이 표시됩니다.
        </p>
      </>
    ),
  },
  {
    n: 7,
    title: '회원앱 안내',
    body: (
      <div className="space-y-3 text-left">
        <p className="landing-guide-text">
          회원에게 아래 주소를 안내해 주세요.
        </p>
        <a
          href={getMemberPortalUrl()}
          className="block break-all rounded-xl border border-charcoal/10 bg-motionhub-light/40 px-4 py-3 text-left text-sm font-semibold leading-normal text-motionhub-deep transition hover:border-motionhub/30"
        >
          {getMemberPortalUrl()}
        </a>
        <p className="text-left text-xs leading-relaxed text-charcoal/50">
          센터 코드: {MOTIONHUB_SITE_URL}/member?center={'{센터코드}'}
        </p>
      </div>
    ),
  },
]

const FAQ = [
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
    a: '베타 정책에 따라 안내드립니다. 카카오채널로 문의해 주세요.',
  },
] as const

export default function GuidePage() {
  useMotionHubGuideSeo()
  const kakaoUrl = getMotionHubKakaoUrl()

  return (
    <div className="min-h-screen bg-surface">
      <LandingNav activePage="guide" />
      <main className="pt-[3.75rem]">
        <section className="landing-hero-mesh border-b border-white/[0.06] py-16 sm:py-20">
          <LandingContainer>
            <div className="max-w-2xl">
              <SectionEyebrow light>Center Onboarding</SectionEyebrow>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-cream sm:text-4xl lg:text-5xl">
                모션허브 시작 가이드
              </h1>
              <p className="mt-5 text-base leading-relaxed text-cream/70 sm:text-lg lg:whitespace-nowrap">
                센터 대표 · 관리자 · 프리랜서 트레이너를 위한 초기 설정 체크리스트입니다.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <PrimaryButton to="/login">관리자 로그인</PrimaryButton>
                <SecondaryButton to="/signup">센터 등록</SecondaryButton>
                <Link
                  to="/"
                  className="text-center text-sm font-semibold text-cream/60 underline-offset-4 hover:text-cream hover:underline"
                >
                  랜딩으로 돌아가기
                </Link>
              </div>
            </div>
          </LandingContainer>
        </section>

        <section className="bg-[#f7f3ec] py-14 sm:py-16">
          <LandingContainer>
            <div className="mb-10 max-w-xl">
              <SectionEyebrow>Checklist</SectionEyebrow>
              <SectionTitle>7단계로 시작하기</SectionTitle>
              <SectionLead>
                가입 직후 아래 순서대로 진행하면 회원 등록부터 알림톡까지
                기본 운영을 바로 시작할 수 있습니다.
              </SectionLead>
            </div>

            <ol className="relative space-y-0">
              {STEPS.map((step, idx) => (
                <li key={step.n} className="relative flex gap-4 pb-8 last:pb-0 sm:gap-6">
                  {idx < STEPS.length - 1 ? (
                    <span
                      className="absolute left-[1.125rem] top-12 bottom-0 w-px bg-gradient-to-b from-motionhub/40 to-charcoal/10 sm:left-5"
                      aria-hidden
                    />
                  ) : null}
                  <span className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-white text-sm font-bold text-gold-dark shadow-sm sm:h-10 sm:w-10">
                    {step.n === 0 ? '★' : step.n}
                  </span>
                  <div className="landing-guide-step min-w-0 flex-1">
                    <h2 className="text-left text-lg font-bold text-charcoal sm:text-xl">
                      {step.title}
                    </h2>
                    <div className="mt-4">{step.body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </LandingContainer>
        </section>

        <section className="border-y border-charcoal/8 bg-white py-14 sm:py-16">
          <LandingContainer>
            <SectionEyebrow>FAQ</SectionEyebrow>
            <SectionTitle>자주 묻는 질문</SectionTitle>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="landing-card landing-card-hover p-5 text-left sm:p-6"
                >
                  <p className="font-bold text-charcoal">{item.q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal/65">
                    {item.a}
                  </p>
                </div>
              ))}
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
                {MOTIONHUB_SITE_URL}{MOTIONHUB_CENTER_GUIDE_PATH}
              </p>
            </div>
          </LandingContainer>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
