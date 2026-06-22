import { useState, type FormEvent, type ReactNode } from 'react'
import { submitBetaApplication, type CenterType } from '../api/betaApplication'
import { MotionHubLogo } from '../components/brand/MotionHubLogo'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingNav } from '../components/landing/LandingNav'
import {
  FeatureIcon,
  GhostButton,
  LandingContainer,
  PrimaryButton,
  SecondaryButton,
  SectionEyebrow,
  SectionLead,
  SectionTitle,
} from '../components/landing/landingPrimitives'
import { MOTIONHUB_CENTER_GUIDE_PATH } from '../constants/motionhubGuide'
import {
  getMotionHubDemoUrl,
  getMotionHubKakaoUrl,
  MOTIONHUB_CONTACT,
  MOTIONHUB_TRUST_FEATURES,
} from '../constants/motionhub'
import { MOTIONHUB_MAIN_MESSAGE } from '../constants/motionhubSeo'
import { useMotionHubSeo } from '../hooks/useMotionHubSeo'
import { getErrorMessage } from '../lib/errors'

const PROBLEMS = [
  '회원 정보가 여러 곳에 흩어져 있음',
  '재등록 시점을 놓치기 쉬움',
  '회원 참여·출석 관리가 수기로 이어짐',
  '알림과 운영이 분리되어 비효율적',
] as const

const FEATURES: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: '재등록 관리',
    desc: '만료·잔여 세션을 한눈에 보고 재등록 타이밍을 놓치지 않습니다.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4v5h5M20 20v-5h-5" />
        <path d="M20 8a8 8 0 0 0-14.9-3M4 16a8 8 0 0 0 14.9 3" />
      </svg>
    ),
  },
  {
    title: '회원·출석 관리',
    desc: '등록, PT 출석, 이용 현황을 한 화면에서 빠르게 확인합니다.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: '알림톡 자동화',
    desc: '등록·결제·리마인더·만료 안내를 자동 발송해 운영 부담을 줄입니다.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    ),
  },
  {
    title: '운동일지',
    desc: '회원별 기록을 남겨 상담 품질과 케어 경험을 높입니다.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    title: '마일리지 · 걸음 인증',
    desc: '센터 밖 활동까지 연결해 회원 참여와 방문 습관을 이어갑니다.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: '센터 맞춤 운영',
    desc: 'PT샵, 필라테스, 프리랜서 트레이너 등 다양한 운영 형태를 지원합니다.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
]

const CENTER_TYPES: { value: CenterType; label: string }[] = [
  { value: 'pt', label: 'PT샵' },
  { value: 'pilates', label: '필라테스' },
  { value: 'freelance', label: '프리랜서' },
  { value: 'other', label: '기타' },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function HeroPreview() {
  return (
    <div className="landing-preview">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-cream/50">오늘의 운영</span>
        <span className="rounded-full bg-motionhub/20 px-2.5 py-0.5 text-[10px] font-bold text-motionhub">
          LIVE
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '활성 회원', value: '128' },
          { label: '오늘 PT', value: '24' },
          { label: '재등록 D-7', value: '6' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/8 bg-black/20 px-3 py-3"
          >
            <p className="text-[10px] text-cream/45">{stat.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-cream">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {['김○○ · PT 18:00', '이○○ · 필라테스 19:30', '박○○ · 만료 3일 전'].map(
          (row) => (
            <div
              key={row}
              className="flex items-center justify-between rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2.5 text-xs text-cream/75"
            >
              <span>{row}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-motionhub" />
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function HeroSection() {
  const demoUrl = getMotionHubDemoUrl()

  return (
    <section className="landing-hero-mesh relative overflow-hidden pt-24 pb-16 sm:pt-28 sm:pb-24">
      <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-motionhub/10 blur-3xl" aria-hidden />
      <LandingContainer>
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-xl">
            <p className="landing-eyebrow text-motionhub">Beta · 모션허브</p>
            <h1 className="mt-4">
              <MotionHubLogo tone="light" variant="vertical" size="hero" locale="ko" />
            </h1>
            <p className="mt-6 text-lg font-medium leading-relaxed text-cream/85 sm:text-xl">
              {MOTIONHUB_MAIN_MESSAGE}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream/55 sm:text-base">
              회원관리 · 재등록 · 출석 · 알림톡 · 운동일지를
              하나의 플랫폼에서 운영하세요.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <PrimaryButton onClick={() => scrollToId('beta')}>
                베타 신청하기
              </PrimaryButton>
              <SecondaryButton href={demoUrl} external>
                데모 보기
              </SecondaryButton>
              <GhostButton to={MOTIONHUB_CENTER_GUIDE_PATH}>
                시작 가이드
              </GhostButton>
            </div>
          </div>
          <div className="lg:pl-4">
            <HeroPreview />
          </div>
        </div>
      </LandingContainer>
    </section>
  )
}

function TrustSection() {
  return (
    <section className="border-b border-charcoal/8 bg-white py-14 sm:py-16">
      <LandingContainer>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex rounded-full border border-motionhub/25 bg-motionhub-light px-3 py-1 text-xs font-bold text-motionhub-deep">
              실제 센터에서 운영 중
            </span>
            <p className="mt-5 text-xl font-semibold leading-snug text-charcoal sm:text-2xl">
              모션허브는 현장 PT 센터 운영 경험을 바탕으로 만들어졌습니다.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            {MOTIONHUB_TRUST_FEATURES.map((feature) => (
              <li
                key={feature}
                className="rounded-full border border-charcoal/10 bg-cream/50 px-3.5 py-1.5 text-sm font-medium text-charcoal/75"
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </LandingContainer>
    </section>
  )
}

function ProblemsSection() {
  return (
    <section id="problems" className="bg-[#f7f3ec] py-20 sm:py-24">
      <LandingContainer>
        <SectionEyebrow>Problem</SectionEyebrow>
        <SectionTitle>센터 운영, 왜 이렇게 복잡할까요?</SectionTitle>
        <SectionLead>
          PT샵·필라테스·프리랜서 트레이너 모두 비슷한 운영 부담을 겪습니다.
          도구가 나뉘어 있을수록 현장 업무는 더 바빠집니다.
        </SectionLead>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {PROBLEMS.map((problem, i) => (
            <li
              key={problem}
              className="landing-card landing-card-hover flex gap-4 p-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal text-sm font-bold text-cream">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-base font-semibold leading-relaxed text-charcoal">
                {problem}
              </p>
            </li>
          ))}
        </ul>
      </LandingContainer>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-20 sm:py-24">
      <LandingContainer>
        <SectionEyebrow>Solution</SectionEyebrow>
        <SectionTitle>운영에 필요한 기능을 한곳에</SectionTitle>
        <SectionLead>
          회원 유지와 재등록, 현장 운영 효율을 돕는 핵심 기능을
          모션허브 하나로 연결했습니다.
        </SectionLead>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="landing-card landing-card-hover p-6"
            >
              <FeatureIcon>{feature.icon}</FeatureIcon>
              <h3 className="mt-5 text-lg font-bold text-charcoal">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/60">
                {feature.desc}
              </p>
            </li>
          ))}
        </ul>
      </LandingContainer>
    </section>
  )
}

function CaseStudySection() {
  return (
    <section id="case-study" className="landing-hero-mesh py-20 sm:py-24">
      <LandingContainer>
        <SectionEyebrow light>Case Study</SectionEyebrow>
        <SectionTitle light>실제 운영 사례</SectionTitle>
        <article className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10 lg:max-w-3xl">
          <p className="text-sm font-semibold text-motionhub">Partner Center</p>
          <h3 className="mt-2 text-2xl font-bold text-cream sm:text-3xl">
            모벨 퍼포먼스 트레이닝
          </h3>
          <p className="mt-5 text-base leading-relaxed text-cream/75">
            모션허브는 모벨 퍼포먼스 트레이닝에서 실제 운영 중인 플랫폼입니다.
            회원관리, 운동일지, 출석, 알림톡, 재등록 관리까지 하나의 시스템으로
            사용하고 있습니다.
          </p>
        </article>
      </LandingContainer>
    </section>
  )
}

function BetaSection() {
  const [centerName, setCenterName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [centerType, setCenterType] = useState<CenterType>('pt')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!centerName.trim() || !contactName.trim() || !phone.trim()) {
      setError('센터명, 담당자명, 연락처를 입력해 주세요.')
      return
    }
    setLoading(true)
    try {
      await submitBetaApplication({
        centerName,
        contactName,
        phone,
        email,
        centerType,
        message,
      })
      setSuccess(true)
      setCenterName('')
      setContactName('')
      setPhone('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="beta" className="bg-[#f7f3ec] py-20 sm:py-24">
      <LandingContainer>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <div>
            <SectionEyebrow>Beta</SectionEyebrow>
            <SectionTitle>베타 파트너 센터 모집</SectionTitle>
            <SectionLead>
              실제 운영 환경에서 함께 제품을 다듬을 초기 파트너를 찾고 있습니다.
              14일 무료 체험으로 시작할 수 있습니다.
            </SectionLead>
            <div className="mt-8 landing-card p-6">
              <h3 className="text-sm font-bold text-charcoal">베타 혜택</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-charcoal/75">
                {['초기 세팅 지원', '운영 피드백 우선 반영', '신규 기능 우선 제공', '초기 파트너 혜택'].map(
                  (item) => (
                    <li key={item} className="flex gap-2">
                      <span className="font-bold text-motionhub-dark">✓</span>
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
          <form onSubmit={(e) => void handleSubmit(e)} className="landing-card p-6 sm:p-8">
            <h3 className="text-lg font-bold text-charcoal">베타 신청서</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-charcoal">센터명 *</span>
                <input
                  type="text"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  className="input-field"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-charcoal">담당자명 *</span>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="input-field"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-charcoal">연락처 *</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  required
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-charcoal">이메일</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium text-charcoal">센터 유형</legend>
                <div className="flex flex-wrap gap-2">
                  {CENTER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setCenterType(type.value)}
                      className={`chip ${centerType === type.value ? 'chip-active' : 'chip-inactive'}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-charcoal">문의 내용</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="input-field resize-y"
                />
              </label>
            </div>
            {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
            {success ? (
              <p className="mt-4 rounded-xl border border-motionhub/20 bg-motionhub-light px-4 py-3 text-sm font-semibold text-motionhub-deep">
                베타 신청이 접수되었습니다. 확인 후 연락드리겠습니다.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="landing-btn-primary mt-6 w-full disabled:opacity-50"
            >
              {loading ? '접수 중…' : '신청하기'}
            </button>
          </form>
        </div>
      </LandingContainer>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="bg-white py-20 sm:py-24">
      <LandingContainer>
        <SectionEyebrow>Contact</SectionEyebrow>
        <SectionTitle>도입 문의</SectionTitle>
        <SectionLead>베타·기능·도입 상담은 아래 채널로 연락해 주세요.</SectionLead>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href={getMotionHubKakaoUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-card landing-card-hover flex items-center gap-4 p-6"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEE500] text-sm font-black text-charcoal">
              Kakao
            </span>
            <div>
              <p className="font-bold text-charcoal">카카오채널</p>
              <p className="mt-1 text-sm text-charcoal/55">모션허브 공식 채널</p>
            </div>
          </a>
          <a
            href={MOTIONHUB_CONTACT.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-card landing-card-hover flex items-center gap-4 p-6"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-xs font-bold text-white">
              IG
            </span>
            <div>
              <p className="font-bold text-charcoal">인스타그램</p>
              <p className="mt-1 text-sm text-charcoal/55">
                {MOTIONHUB_CONTACT.instagramHandle}
              </p>
            </div>
          </a>
        </div>
      </LandingContainer>
    </section>
  )
}

function BottomCtaSection() {
  return (
    <section className="landing-hero-mesh border-t border-white/[0.06] py-16 sm:py-20">
      <LandingContainer className="text-center">
        <p className="text-lg font-bold text-cream sm:text-xl">베타 센터 모집 중</p>
        <p className="mt-2 text-sm text-cream/55">14일 무료 · 승인 후 이용 시작일 설정</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
          <PrimaryButton onClick={() => scrollToId('beta')}>베타 신청</PrimaryButton>
          <SecondaryButton to="/signup">센터 등록</SecondaryButton>
          <GhostButton to={MOTIONHUB_CENTER_GUIDE_PATH}>이용가이드</GhostButton>
        </div>
      </LandingContainer>
    </section>
  )
}

export default function MotionHubLandingPage() {
  useMotionHubSeo()

  return (
    <div className="min-h-screen bg-surface">
      <LandingNav onScrollTo={scrollToId} />
      <main>
        <HeroSection />
        <TrustSection />
        <ProblemsSection />
        <FeaturesSection />
        <CaseStudySection />
        <BetaSection />
        <ContactSection />
        <BottomCtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}
