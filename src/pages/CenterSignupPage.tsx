import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { selfRegisterCenter } from '../api/centerSignup'
import { MotionHubAuthShell } from '../components/layouts/MotionHubAuthShell'
import { saveRememberedAdminCenterSlug } from '../lib/centerSlug'
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
        contactPhone: contactPhone || undefined,
      })
      saveRememberedAdminCenterSlug(created.centerSlug)
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
            <strong>{result.centerName}</strong> 센터가 MotionHub에 등록되었습니다.
            슈퍼 관리자가 이용 기간을 설정하면 관리자 화면을 사용할 수 있습니다.
          </p>
          <dl className="space-y-2 rounded-xl border border-teal-200/60 bg-white/70 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">관리자 아이디</dt>
              <dd className="font-mono font-medium text-charcoal">{result.adminUsername}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">
            등록 내역은 MotionHub Super Admin 콘솔의 센터 목록에서 확인·승인할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className={btnPrimary}>
              로그인하기
            </Link>
            <Link to="/" className={btnOutline}>
              홈으로
            </Link>
          </div>
        </section>
      </MotionHubAuthShell>
    )
  }

  return (
    <MotionHubAuthShell
      title="센터 등록"
      subtitle="MotionHub에서 센터를 개설하고 관리자 계정을 만듭니다. 승인 후 이용할 수 있습니다."
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
            <span className="mb-1.5 block font-medium text-charcoal">연락처</span>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={inputClass}
              placeholder="010-0000-0000"
              disabled={loading}
            />
          </label>

          <button
            type="submit"
            disabled={
              loading ||
              !name.trim() ||
              !slug.trim() ||
              !adminUsername.trim() ||
              adminPassword.length < 4
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
