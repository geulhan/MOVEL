import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { submitBetaApplication, type CenterType } from '../api/betaApplication'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingNav } from '../components/landing/LandingNav'
import {
  AUTOMATION_FLOW,
  AUTO_EXAMPLES,
  FAQ_ITEMS,
  LANDING_HERO,
  LEGACY_DAY_TOOLS,
  TODAY_FEED_TASKS,
  TRIAL_BULLETS,
  WHY_PAIN_STEPS,
} from '../components/landing/conversion/landingContent'
import { LandingScreenshot } from '../components/landing/conversion/LandingScreenshot'
import {
  LandingContainer,
  PrimaryButton,
  SectionEyebrow,
  SectionLead,
  SectionTitle,
} from '../components/landing/landingPrimitives'
import { getErrorMessage } from '../lib/errors'
import { useMotionHubSeo } from '../hooks/useMotionHubSeo'

const CENTER_TYPES: { value: CenterType; label: string }[] = [
  { value: 'pt', label: 'PT샵' },
  { value: 'pilates', label: '필라테스' },
  { value: 'freelance', label: '프리랜서' },
  { value: 'other', label: '기타' },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function HeroSection() {
  return (
    <section className="landing-hero-mesh relative overflow-hidden pt-[4.5rem] pb-16 sm:pt-24 sm:pb-20">
      <LandingContainer className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-eyebrow text-motionhub">모션 허브 · AI Operating System</p>
          <h1 className="mt-5 text-[1.75rem] font-bold leading-[1.25] tracking-tight text-cream sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {LANDING_HERO.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-cream/65 sm:text-lg">
            {LANDING_HERO.subCopy.join(' · ')}
          </p>
          <p className="mt-8 text-sm font-medium text-cream/50">{LANDING_HERO.ctaNote}</p>
          <div className="mt-4 flex justify-center">
            <PrimaryButton to="/signup" className="min-w-[14rem] px-8 py-4 text-base">
              {LANDING_HERO.ctaLabel}
            </PrimaryButton>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-5xl">
          <LandingScreenshot
            src="/landing/today-feed.png"
            alt="모션 허브 Today Feed 화면 — 오늘 해야 할 일 목록"
            caption={LANDING_HERO.feedCaption}
            priority
          />
        </div>
      </LandingContainer>
    </section>
  )
}

function WhySection() {
  return (
    <section id="why" className="bg-white py-20 sm:py-28">
      <LandingContainer>
        <div className="landing-section-centered">
          <SectionEyebrow centered>Why 모션 허브</SectionEyebrow>
          <SectionTitle centered className="mt-3">
            대표의 문제부터 시작합니다
          </SectionTitle>
        </div>

        <div className="mx-auto mt-14 max-w-lg">
          <ul className="space-y-0">
            {WHY_PAIN_STEPS.map((step, index) => (
              <li key={step} className="landing-pain-step">
                <p
                  className={
                    index === 0
                      ? 'text-lg font-bold text-charcoal sm:text-xl'
                      : 'text-base font-medium text-charcoal/75'
                  }
                >
                  {step}
                </p>
                {index < WHY_PAIN_STEPS.length - 1 ? (
                  <span className="landing-pain-arrow" aria-hidden>
                    ↓
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-center text-xl font-bold text-motionhub-deep sm:text-2xl">
            모션 허브 하나로 해결됩니다.
          </p>
        </div>
      </LandingContainer>
    </section>
  )
}

function FlowSection() {
  return (
    <section className="bg-[#f7f3ec] py-20 sm:py-28">
      <LandingContainer>
        <div className="landing-section-centered">
          <SectionEyebrow centered>How it works</SectionEyebrow>
          <SectionTitle centered className="mt-3">
            모션 허브가 대신하는 일
          </SectionTitle>
        </div>

        <ul className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUTOMATION_FLOW.map((item) => (
            <li key={item.step} className="landing-flow-card">
              <p className="text-sm font-semibold text-charcoal">{item.step}</p>
              <span className="my-3 block text-motionhub" aria-hidden>
                ↓
              </span>
              <p className="text-sm font-bold text-motionhub-deep">{item.result}</p>
            </li>
          ))}
        </ul>
      </LandingContainer>
    </section>
  )
}

function DayCompareSection() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <LandingContainer>
        <div className="landing-section-centered">
          <SectionEyebrow centered>Your day</SectionEyebrow>
          <SectionTitle centered className="mt-3">
            대표의 하루가 달라집니다
          </SectionTitle>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-2">
          <div className="landing-compare-col landing-compare-col--legacy">
            <p className="text-xs font-bold tracking-wide text-charcoal/40 uppercase">기존</p>
            <ul className="mt-6 space-y-3">
              {LEGACY_DAY_TOOLS.map((tool) => (
                <li
                  key={tool}
                  className="rounded-xl border border-charcoal/8 bg-cream/40 px-4 py-3 text-sm font-medium text-charcoal/70"
                >
                  {tool}
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-compare-col landing-compare-col--motionhub">
            <p className="text-xs font-bold tracking-wide text-motionhub uppercase">
              모션 허브 Today Feed
            </p>
            <span className="mt-4 block text-2xl text-motionhub" aria-hidden>
              ↓
            </span>
            <ul className="mt-4 space-y-3">
              {TODAY_FEED_TASKS.map((task) => (
                <li
                  key={task}
                  className="rounded-xl border border-motionhub/25 bg-motionhub-light/50 px-4 py-3 text-sm font-semibold text-charcoal"
                >
                  {task}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-medium text-charcoal/60">
              위에서 아래로 처리만 하면 끝
            </p>
          </div>
        </div>
      </LandingContainer>
    </section>
  )
}

function AutomationSection() {
  return (
    <section id="automation" className="bg-[#f7f3ec] py-20 sm:py-28">
      <LandingContainer>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionEyebrow>Automation</SectionEyebrow>
            <SectionTitle className="mt-3">운영 자동화</SectionTitle>
            <SectionLead>
              대표가 반복하는 업무를 모션 허브가 대신 처리합니다.
            </SectionLead>
            <ul className="mt-8 flex flex-wrap gap-2">
              {AUTO_EXAMPLES.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-sm font-medium text-charcoal/80"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <LandingScreenshot
            src="/landing/messages-automation.png"
            alt="모션 허브 메시지 자동화 화면"
          />
        </div>
      </LandingContainer>
    </section>
  )
}

function AiSection() {
  return (
    <section id="ai" className="bg-white py-20 sm:py-28">
      <LandingContainer>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionEyebrow>AI Action</SectionEyebrow>
            <SectionTitle className="mt-3">AI 운영비서</SectionTitle>
            <SectionLead>
              분석이 아니라 실행(Action)을 제안합니다. 오늘 무엇을 해야 매출과 유지율이
              올라가는지, 한 화면에서 바로 처리하세요.
            </SectionLead>
            <div className="landing-ai-card mt-8 lg:hidden">
              <AiActionPreview />
            </div>
          </div>
          <div className="space-y-8">
            <div className="landing-ai-card hidden lg:block">
              <AiActionPreview />
            </div>
            <LandingScreenshot
              src="/landing/ai-assistant.png"
              alt="모션 허브 AI 운영비서 화면"
            />
          </div>
        </div>
      </LandingContainer>
    </section>
  )
}

function AiActionPreview() {
  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-wide text-charcoal/45">
        Today Feed · 재등록 필요
      </p>
      <p className="mt-3 text-lg font-bold text-charcoal">오늘 가장 중요한 회원</p>
      <p className="mt-1 text-2xl font-bold text-charcoal">김○○</p>
      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between gap-4 border-b border-charcoal/8 pb-2">
          <dt className="text-charcoal/55">잔여 PT</dt>
          <dd className="font-semibold text-charcoal">2회</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-charcoal/8 pb-2">
          <dt className="text-charcoal/55">미예약</dt>
          <dd className="font-semibold text-charcoal">7일</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-charcoal/55">재등록 성공률</dt>
          <dd className="font-bold text-motionhub-deep">83%</dd>
        </div>
      </dl>
      <p className="landing-btn-primary mt-6 w-full text-center opacity-90">알림톡 보내기</p>
    </>
  )
}

function TrialSection() {
  return (
    <section className="bg-motionhub-deep py-20 sm:py-24">
      <LandingContainer className="text-center">
        <SectionEyebrow light centered>
          Beta
        </SectionEyebrow>
        <SectionTitle light centered className="mt-3">
          14일 동안 충분히 사용해보세요
        </SectionTitle>
        <ul className="mx-auto mt-10 flex max-w-md flex-col gap-3 text-left">
          {TRIAL_BULLETS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-cream/90"
            >
              <span className="text-motionhub" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <PrimaryButton to="/signup" className="mt-10 min-w-[14rem]">
          무료 세팅 시작하기
        </PrimaryButton>
      </LandingContainer>
    </section>
  )
}

function FaqSection() {
  return (
    <section id="faq" className="bg-[#f7f3ec] py-20 sm:py-28">
      <LandingContainer>
        <div className="landing-section-centered">
          <SectionEyebrow centered>FAQ</SectionEyebrow>
          <SectionTitle centered className="mt-3">
            자주 묻는 질문
          </SectionTitle>
        </div>
        <div className="mx-auto mt-12 max-w-2xl space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="landing-faq group">
              <summary className="cursor-pointer list-none font-semibold text-charcoal [&::-webkit-details-marker]:hidden">
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/65">{item.a}</p>
            </details>
          ))}
        </div>
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
    <section id="beta" className="bg-white py-20 sm:py-28">
      <LandingContainer>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <div>
            <SectionEyebrow>Setup support</SectionEyebrow>
            <SectionTitle className="mt-3">세팅이 필요하신가요?</SectionTitle>
            <SectionLead>
              직접 시작하셔도 되고, 초기 세팅 지원이 필요하면 아래 양식을 남겨 주세요.
            </SectionLead>
            <PrimaryButton to="/signup" className="mt-8">
              바로 14일 체험 시작
            </PrimaryButton>
          </div>
          <form onSubmit={(e) => void handleSubmit(e)} className="landing-card p-6 sm:p-8">
            <h3 className="text-lg font-bold text-charcoal">세팅 지원 신청</h3>
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
                신청이 접수되었습니다. 확인 후 연락드리겠습니다.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="landing-btn-secondary-light mt-6 w-full disabled:opacity-50"
            >
              {loading ? '접수 중…' : '세팅 지원 신청하기'}
            </button>
          </form>
        </div>
      </LandingContainer>
    </section>
  )
}

function FinalCtaSection() {
  return (
    <section className="landing-hero-mesh border-t border-white/[0.06] py-20 sm:py-28">
      <LandingContainer className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold leading-snug text-cream sm:text-3xl lg:text-4xl">
          운동센터를 운영하는 방식이 바뀝니다.
        </h2>
        <p className="mt-6 text-base leading-relaxed text-cream/65 sm:text-lg">
          대표는 회원에게 집중하세요.
          <br />
          운영은 모션 허브가 하겠습니다.
        </p>
        <PrimaryButton to="/signup" className="mt-10 min-w-[14rem] px-8 py-4 text-base">
          14일 무료 체험 시작
        </PrimaryButton>
      </LandingContainer>
    </section>
  )
}

export default function MotionHubLandingPage() {
  useMotionHubSeo()
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace(/^#/, '')
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [location.hash])

  return (
    <div className="min-h-screen bg-surface">
      <LandingNav onScrollTo={scrollToId} />
      <main>
        <HeroSection />
        <WhySection />
        <FlowSection />
        <DayCompareSection />
        <AutomationSection />
        <AiSection />
        <TrialSection />
        <FaqSection />
        <BetaSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}
