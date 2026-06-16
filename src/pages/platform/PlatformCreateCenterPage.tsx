import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createPlatformCenter } from '../../api/platformCenters'
import { formatPhone, todayDateString } from '../../api/members'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function PlatformCreateCenterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [adminUsername, setAdminUsername] = useState('admin')
  const [adminPassword, setAdminPassword] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [serviceStartsAt, setServiceStartsAt] = useState(todayDateString())
  const [serviceEndsAt, setServiceEndsAt] = useState(addDays(todayDateString(), 14))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    centerName: string
    centerSlug: string
    adminUsername: string
    contactPhone?: string
    serviceStartsAt?: string
    serviceEndsAt?: string
  } | null>(null)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) {
      setSlug(slugify(value))
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setResult(null)

    const phoneDigits = contactPhone.replace(/\D/g, '')
    if (phoneDigits && (phoneDigits.length !== 11 || !phoneDigits.startsWith('010'))) {
      setError('연락처는 010으로 시작하는 11자리 숫자로 입력해 주세요.')
      return
    }

    if (serviceStartsAt && serviceEndsAt && serviceEndsAt < serviceStartsAt) {
      setError('이용 종료일은 시작일보다 빠를 수 없습니다.')
      return
    }

    setLoading(true)

    try {
      const created = await createPlatformCenter({
        name,
        slug,
        adminUsername,
        adminPassword,
        contactEmail: contactEmail || undefined,
        contactPhone: phoneDigits || undefined,
        serviceStartsAt: serviceStartsAt || undefined,
        serviceEndsAt: serviceEndsAt || undefined,
      })
      setResult({
        centerName: created.centerName,
        centerSlug: created.centerSlug,
        adminUsername: created.adminUsername,
        contactPhone: phoneDigits || undefined,
        serviceStartsAt: serviceStartsAt || undefined,
        serviceEndsAt: serviceEndsAt || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '센터 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <section className={`${cardClass} card-pad !border-emerald-400/20 !bg-emerald-500/10`}>
          <h1 className="text-xl font-bold text-white">센터가 생성되었습니다</h1>
          <dl className="mt-4 space-y-2 text-sm text-cream/80">
            <div className="flex justify-between gap-4">
              <dt>센터명</dt>
              <dd className="font-medium text-white">{result.centerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>센터 코드</dt>
              <dd className="font-mono text-emerald-200">{result.centerSlug}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>관리자 아이디</dt>
              <dd className="font-mono">{result.adminUsername}</dd>
            </div>
            {result.contactPhone && (
              <div className="flex justify-between gap-4">
                <dt>연락처</dt>
                <dd className="font-mono">{formatPhone(result.contactPhone)}</dd>
              </div>
            )}
            {result.serviceStartsAt && (
              <div className="flex justify-between gap-4">
                <dt>이용 시작일</dt>
                <dd>{result.serviceStartsAt}</dd>
              </div>
            )}
            {result.serviceEndsAt && (
              <div className="flex justify-between gap-4">
                <dt>이용 종료일</dt>
                <dd>{result.serviceEndsAt}</dd>
              </div>
            )}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={`/login?center=${encodeURIComponent(result.centerSlug)}`}
              className={btnPrimary}
            >
              관리자 로그인하기
            </Link>
            <button
              type="button"
              onClick={() => navigate('/platform')}
              className={btnOutline}
            >
              센터 목록으로
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">새 센터 생성</h1>
        <p className="mt-1 text-sm text-cream/60">
          센터와 최초 Center Admin 계정을 함께 만듭니다.
        </p>
      </div>

      <section className={`${cardClass} card-pad !border-white/10 !bg-[#161d26]`}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-cream">센터명</span>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={inputClass}
              placeholder="ABC PT"
              required
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-cream">센터 코드 (slug)</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value.toLowerCase())
              }}
              className={inputClass}
              placeholder="abc-pt"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-cream/50">
              로그인 시 센터 코드로 사용됩니다. 영문 소문자·숫자·하이픈만 가능합니다.
            </p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-cream">관리자 아이디</span>
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
              <span className="mb-1.5 block font-medium text-cream">관리자 비밀번호</span>
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
            <span className="mb-1.5 block font-medium text-cream">연락 이메일 (선택)</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-cream">연락처 (선택)</span>
            <input
              type="tel"
              inputMode="numeric"
              value={contactPhone}
              onChange={(e) =>
                setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
              }
              className={inputClass}
              placeholder="01012345678"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-cream/50">
              센터 담당자 연락처입니다. 010으로 시작하는 11자리 숫자만 입력합니다.
            </p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-cream">이용 시작일</span>
              <input
                type="date"
                value={serviceStartsAt}
                onChange={(e) => {
                  const value = e.target.value
                  setServiceStartsAt(value)
                  if (value && serviceEndsAt < value) {
                    setServiceEndsAt(addDays(value, 14))
                  }
                }}
                className={inputClass}
                required
                disabled={loading}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-cream">이용 종료일</span>
              <input
                type="date"
                value={serviceEndsAt}
                min={serviceStartsAt}
                onChange={(e) => setServiceEndsAt(e.target.value)}
                className={inputClass}
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-cream/50">
                베타 체험 기본 14일. 필요 시 조정하세요.
              </p>
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim() || adminPassword.length < 4}
              className={btnPrimary}
            >
              {loading ? '생성 중…' : '센터 생성'}
            </button>
            <Link to="/platform" className={btnOutline}>
              취소
            </Link>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </section>
    </div>
  )
}
