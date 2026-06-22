import { useState, type FormEvent } from 'react'
import { submitBetaApplication, type CenterType } from '../api/betaApplication'
import { MotionHubLogo } from '../components/brand/MotionHubLogo'
import { LandingFooter } from '../components/landing/LandingFooter'
import { LandingNav } from '../components/landing/LandingNav'
import { MOTIONHUB_CENTER_GUIDE_PATH } from '../constants/motionhubGuide'
import {
  getMotionHubDemoUrl,
  getMotionHubKakaoUrl,
  MOTIONHUB_CONTACT,
  MOTIONHUB_TRUST_FEATURES,
} from '../constants/motionhub'
import { MOTIONHUB_SUB_MESSAGE_LINES } from '../constants/motionhubSeo'
import { useMotionHubSeo } from '../hooks/useMotionHubSeo'
import { getErrorMessage } from '../lib/errors'

const PROBLEMS = [
  '회원 관리가 흩어짐',
  '재등록 관리 어려움',
  '회원 참여율 낮음',
  '수기 관리',
] as const

const FEATURES = [
  {
    icon: '↻',
    title: '재등록 관리',
    desc: '만료·잔여 세션을 한눈에 보고, 놓치기 쉬운 재등록 시점을 놓치지 않게 돕습니다.',
  },
  {
    icon: '◆',
    title: '마일리지',
    desc: '회원 참여를 돕고, 꾸준한 방문과 운동 습관을 이어가게 합니다.',
  },
  {
    icon: '👟',
    title: '걸음 인증',
    desc: '센터 밖 일상 활동까지 연결해, 회원의 운동 참여 경험을 넓힙니다.',
  },
  {
    icon: '✉',
    title: '알림톡',
    desc: 'PT 일정·안내를 자동으로 전달해 노쇼를 줄이고 회원 경험을 개선합니다.',
  },
  {
    icon: '◎',
    title: '회원관리',
    desc: '등록·상태·담당 트레이너를 한곳에서 관리해 운영 효율을 높입니다.',
  },
  {
    icon: '✓',
    title: '출석관리',
    desc: 'PT 출석과 센터 이용 현황을 빠르게 확인하고, 현장 운영 부담을 줄입니다.',
  },
  {
    icon: '▤',
    title: '운동일지',
    desc: '회원별 운동 기록을 남겨 상담과 케어 품질을 높입니다.',
  },
] as const

const CENTER_TYPES: { value: CenterType; label: string }[] = [
  { value: 'pt', label: 'PT샵' },
  { value: 'pilates', label: '필라테스 센터' },
  { value: 'freelance', label: '프리랜서 트레이너' },
  { value: 'other', label: '기타' },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function HeroSection() {
  const demoUrl = getMotionHubDemoUrl()

  return (
    <section className="relative overflow-hidden bg-motionhub-deep pt-24 pb-20 sm:pt-28 sm:pb-28">
      <div className="motionhub-glow pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="mt-0">
            <MotionHubLogo tone="light" variant="vertical" size="hero" />
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            {MOTIONHUB_SUB_MESSAGE_LINES.join(' · ')}
            <br />
            하나로 연결하세요.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => scrollToId('beta')}
              className="rounded-xl bg-motionhub px-6 py-3.5 text-center text-sm font-bold text-charcoal transition hover:bg-motionhub-dark"
            >
              베타 신청하기
            </button>
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-cream/25 bg-cream/5 px-6 py-3.5 text-center text-sm font-bold text-cream transition hover:border-cream/40 hover:bg-cream/10"
            >
              데모 보기
            </a>
            <a
              href={MOTIONHUB_CENTER_GUIDE_PATH}
              className="rounded-xl border border-gold/30 bg-gold/10 px-6 py-3.5 text-center text-sm font-bold text-cream transition hover:border-gold/50 hover:bg-gold/15"
            >
              시작 가이드
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section className="border-b border-charcoal/8 bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full border border-motionhub/30 bg-motionhub-light px-3 py-1 text-xs font-bold tracking-wide text-motionhub-deep">
            현재 베타 운영 중
          </p>
          <p className="mt-5 text-lg font-semibold leading-relaxed text-charcoal sm:text-xl">
            모션허브는 실제 PT 센터에서 운영 중인 플랫폼입니다.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {MOTIONHUB_TRUST_FEATURES.map((feature) => (
              <li
                key={feature}
                className="rounded-full border border-charcoal/10 bg-cream/60 px-3.5 py-1.5 text-sm font-medium text-charcoal/80"
              >
                {feature}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-base leading-relaxed text-charcoal/60">
            기능을 실제 운영 환경에서 테스트하며 지속적으로 개선하고 있습니다.
          </p>
        </div>
      </div>
    </section>
  )
}

function ProblemsSection() {
  return (
    <section id="problems" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-widest text-motionhub-dark uppercase">
            Problem
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
            기존 센터 운영 문제
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal/60">
            PT샵, 필라테스, 프리랜서 트레이너 모두 비슷한 운영 부담을 겪습니다.
            회원 유지와 재등록 관리가 어려울수록 현장 업무는 더 바빠집니다.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((problem) => (
            <li
              key={problem}
              className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-lg text-red-500">
                ✕
              </span>
              <p className="mt-4 text-base font-semibold text-charcoal">{problem}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 max-w-3xl space-y-4 text-base leading-relaxed text-charcoal/65">
          <p>
            많은 센터가 회원 관리, 재등록 관리, 출석 확인, 운동 기록 관리를
            여러 도구로 나누어 운영합니다.
          </p>
          <p className="font-medium text-charcoal">
            모션허브는 이 과정을 하나의 플랫폼으로 통합합니다.
          </p>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-widest text-motionhub-dark uppercase">
            Solution
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
            모션허브 기능 소개
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal/60">
            회원 유지, 재등록 관리, 운영 효율을 돕는 기능을
            하나의 플랫폼에 담았습니다.
          </p>
        </div>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="group rounded-2xl border border-charcoal/8 bg-cream/50 p-6 transition hover:border-motionhub/30 hover:bg-motionhub-light/40"
            >
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-4 text-lg font-bold text-charcoal">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/60">{feature.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function CaseStudySection() {
  return (
    <section id="case-study" className="bg-motionhub-deep py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-widest text-motionhub uppercase">
            Case Study
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-cream sm:text-4xl">
            실제 운영 사례
          </h2>
        </div>
        <article className="mt-12 overflow-hidden rounded-3xl border border-motionhub/20 bg-motionhub-deep p-8 sm:p-10">
          <h3 className="text-2xl font-bold text-cream sm:text-3xl">
            모벨 퍼포먼스 트레이닝
          </h3>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream/75">
            모션허브는 현재 모벨 퍼포먼스 트레이닝에서
            <br />
            실제 운영 중인 플랫폼입니다.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-cream/65">
            회원관리, 운동일지, 출석관리,
            <br />
            알림톡, 재등록 관리까지
            <br />
            하나의 플랫폼으로 운영하고 있습니다.
          </p>
        </article>
      </div>
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
    <section id="beta" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold tracking-widest text-motionhub-dark uppercase">
              Beta
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              베타 모집
            </h2>
            <p className="mt-4 text-base leading-relaxed text-charcoal/60">
              현재 베타 센터를 모집하고 있습니다.
            </p>
            <p className="mt-3 text-base leading-relaxed text-charcoal/60">
              실제 운영 환경에서 함께 서비스를 발전시킬
              초기 파트너를 찾고 있습니다.
            </p>

            <div className="mt-8 rounded-2xl border border-motionhub/25 bg-motionhub-light/80 p-5 sm:p-6">
              <h3 className="text-sm font-bold text-charcoal">베타 센터 혜택</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-charcoal/75">
                <li className="flex gap-2">
                  <span className="font-bold text-motionhub-dark">✓</span>
                  초기 세팅 지원
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-motionhub-dark">✓</span>
                  운영 피드백 우선 반영
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-motionhub-dark">✓</span>
                  신규 기능 우선 제공
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-motionhub-dark">✓</span>
                  모션허브 초기 파트너 혜택 제공
                </li>
              </ul>
            </div>
          </div>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="rounded-3xl border border-charcoal/10 bg-white p-6 shadow-sm sm:p-8"
          >
            <h3 className="text-lg font-bold text-charcoal">베타 신청서</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block font-medium text-charcoal">센터명 *</span>
                <input
                  type="text"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  className="input-field"
                  placeholder="예: OO PT 스튜디오"
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
                  placeholder="010-0000-0000"
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
                  placeholder="선택"
                />
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium text-charcoal">센터 유형 *</legend>
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
                  placeholder="궁금한 점이나 현재 운영 방식을 알려주세요"
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
            )}
            {success && (
              <div
                className="mt-4 rounded-xl border border-motionhub/20 bg-motionhub-light px-4 py-3.5"
                role="status"
              >
                <p className="text-sm font-semibold text-motionhub-deep">
                  베타 신청이 접수되었습니다.
                </p>
                <p className="mt-1 text-sm text-motionhub-dark">
                  확인 후 순차적으로 연락드리겠습니다.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-motionhub-dark py-3.5 text-sm font-bold text-white transition hover:bg-motionhub disabled:opacity-50"
            >
              {loading ? '접수 중…' : '신청하기'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-widest text-motionhub-dark uppercase">
            Contact
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
            도입 문의
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal/60">
            베타 신청, 기능 문의, 도입 상담은 아래 채널로 연락해주세요.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href={getMotionHubKakaoUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-charcoal/10 bg-cream/40 p-6 transition hover:border-motionhub/40 hover:bg-motionhub-light/50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEE500] text-xl font-bold text-charcoal">
              Ch
            </span>
            <div>
              <p className="font-bold text-charcoal">카카오톡</p>
              <p className="mt-1 text-sm text-charcoal/60">채널로 문의하기</p>
            </div>
          </a>
          <a
            href={MOTIONHUB_CONTACT.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-charcoal/10 bg-cream/40 p-6 transition hover:border-motionhub/40 hover:bg-motionhub-light/50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-xl text-white">
              ◎
            </span>
            <div>
              <p className="font-bold text-charcoal">인스타그램</p>
              <p className="mt-1 text-sm text-charcoal/60">
                {MOTIONHUB_CONTACT.instagramHandle}
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}

function BottomCtaSection() {
  return (
    <section className="border-t border-charcoal/10 bg-motionhub-deep py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="text-lg font-bold text-cream sm:text-xl">현재 베타 센터 모집 중</p>
        <p className="mt-3 text-base text-cream/75">14일 무료 사용 가능</p>
        <p className="mt-2 text-sm text-cream/55">
          이용 시작일은 승인 시 설정할 수 있습니다.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => scrollToId('beta')}
            className="rounded-xl bg-motionhub px-6 py-3.5 text-sm font-bold text-charcoal transition hover:bg-motionhub-dark"
          >
            베타 신청하기
          </button>
          <a
            href="/signup"
            className="rounded-xl border border-cream/25 bg-cream/5 px-6 py-3.5 text-sm font-bold text-cream transition hover:border-cream/40 hover:bg-cream/10"
          >
            센터 등록
          </a>
          <a
            href={MOTIONHUB_CENTER_GUIDE_PATH}
            className="rounded-xl border border-gold/30 bg-gold/10 px-6 py-3.5 text-sm font-bold text-cream transition hover:border-gold/50"
          >
            이용가이드
          </a>
        </div>
      </div>
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
