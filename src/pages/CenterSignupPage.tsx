import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { selfRegisterCenter } from '../api/centerSignup'
import {
  SignupConsentFields,
  isSignupConsentComplete,
  type SignupConsentState,
} from '../components/auth/SignupConsentFields'
import { MotionHubAuthShell } from '../components/layouts/MotionHubAuthShell'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../styles/theme'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function CenterSignupPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [consents, setConsents] = useState<SignupConsentState>({
    agreeAge: false,
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    centerName: string
    centerSlug: string
    adminUsername: string
  } | null>(null)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const created = await selfRegisterCenter({
        name,
        slug,
        adminUsername,
        adminPassword,
        contactEmail: contactEmail || undefined,
        contactPhone,
        agreeAge: consents.agreeAge,
        agreeTerms: consents.agreeTerms,
        agreePrivacy: consents.agreePrivacy,
        agreeMarketing: consents.agreeMarketing,
      })
      setResult({
        centerName: created.centerName,
        centerSlug: created.centerSlug,
        adminUsername: created.adminUsername,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '센터 등록에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <MotionHubAuthShell>
        <section className={`${cardClass} card-pad space-y-4 border-teal-200 bg-teal-50/60`}>
          <h1 className="text-lg font-bold text-charcoal">센터 등록이 완료되었습니다</h1>
          <p className="text-sm leading-relaxed text-charcoal/75">
            <strong>{result.centerName}</strong> 센터가 등록되었습니다.
            가입일 기준 <strong>14일 무료 체험</strong>이 자동으로 시작됩니다. 바로
            관리자 로그인 후 이용하실 수 있습니다.
          </p>
          <dl className="space-y-2 rounded-xl border border-teal-200/60 bg-white/70 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">관리자 아이디</dt>
              <dd className="font-mono font-medium text-charcoal">{result.adminUsername}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">
            체험 기간 종료 전 연장·전환 안내는 모션허브 카카오채널로 안내드립니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/login?next=%2Fadmin%2Fmembers%3Fonboarding%3Dregister"
              className={btnPrimary}
            >
              시작하기 — 로그인
            </Link>
            <Link to="/guide" className={btnOutline}>
              5분 가이드 보기
            </Link>
          </div>
        </section>
      </MotionHubAuthShell>
    )
  }

  return (
    <MotionHubAuthShell
      title="센터 등록"
      subtitle="가입 즉시 14일 무료 체험이 시작됩니다. 센터 정보를 입력해 주세요."
    >
      <section className={`${cardClass} card-pad`}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-charcoal">센터명 *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={inputClass}
              placeholder="예: OO PT 스튜디오"
              required
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-charcoal">센터 주소 *</span>
            <div className="flex items-center gap-1 text-sm text-muted">
              <span>motionhub.kr/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value.toLowerCase())
                }}
                className={`${inputClass} flex-1`}
                placeholder="abc-pt"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                disabled={loading}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              회원·관리자 페이지 구분용 주소입니다. 로그인 시 따로 입력하지 않아도 됩니다.
            </p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-charcoal">관리자 아이디 *</span>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className={inputClass}
                required
                disabled={loading}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-charcoal">비밀번호 *</span>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className={inputClass}
                minLength={4}
                required
                disabled={loading}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-charcoal">연락 이메일</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-charcoal">휴대전화번호 *</span>
            <input
              type="tel"
              inputMode="numeric"
              value={contactPhone}
              onChange={(e) =>
                setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
              }
              className={inputClass}
              placeholder="01012345678"
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-muted">
              비밀번호 초기화 시 휴대폰 뒤 4자리를 사용합니다.
            </p>
          </label>

          <div className="rounded-xl border border-teal-200/70 bg-teal-50/50 px-4 py-3 text-sm text-charcoal/75">
            <p className="font-semibold text-charcoal">14일 무료 체험</p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-charcoal/70">
              <li>· 가입 완료 즉시 체험 기간이 시작됩니다</li>
              <li>· 체험 기간 14일 (가입일 포함)</li>
              <li>· 등록 후 바로 관리자 로그인 가능</li>
            </ul>
          </div>

          <SignupConsentFields value={consents} onChange={setConsents} disabled={loading} />

          <button
            type="submit"
            disabled={
              loading ||
              !name.trim() ||
              !slug.trim() ||
              !adminUsername.trim() ||
              adminPassword.length < 4 ||
              contactPhone.length !== 11 ||
              !isSignupConsentComplete(consents)
            }
            className={`w-full ${btnPrimary}`}
          >
            {loading ? '등록 중…' : '센터 등록하기'}
          </button>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      </section>

      <p className="text-center text-sm text-muted">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-semibold text-teal-700 hover:underline">
          로그인
        </Link>
      </p>
    </MotionHubAuthShell>
  )
}
