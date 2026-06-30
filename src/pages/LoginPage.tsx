import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { loginAdmin } from '../api/adminAuth'
import { MotionHubAuthShell } from '../components/layouts/MotionHubAuthShell'
import { getErrorMessage } from '../lib/errors'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  clearAdminAuth,
  getAdminSession,
  isAdminAuthenticated,
} from '../lib/adminSession'
import { resetCenterIdCache } from '../lib/center'
import {
  clearRememberedAdminCenterSlug,
  saveRememberedAdminCenterSlug,
} from '../lib/centerSlug'
import {
  clearRememberedAdminLogin,
  loadRememberedAdminLogin,
  saveRememberedAdminLogin,
} from '../lib/rememberLogin'
import { getMemberPortalUrl } from '../lib/siteUrl'
import { btnPrimary, cardClass, inputClass } from '../styles/theme'

type LoginLocationState = {
  from?: { pathname: string }
}

function resolveAdminRedirect(
  role: 'admin' | 'trainer',
  fromState?: string,
  next?: string | null,
): string {
  if (role === 'trainer') return '/admin/members'
  if (next && next.startsWith('/admin')) return next
  if (fromState && fromState.startsWith('/admin')) return fromState
  return '/admin'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [centerSlug, setCenterSlug] = useState('')
  const [needCenterSlug, setNeedCenterSlug] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberLogin, setRememberLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urlCenter = searchParams.get('center')?.trim().toLowerCase() || null
  const nextPath = searchParams.get('next')?.trim() || null
  const session = getAdminSession()

  useEffect(() => {
    clearRememberedAdminCenterSlug()
    if (urlCenter) {
      setSearchParams({}, { replace: true })
    }
  }, [urlCenter, setSearchParams])

  useEffect(() => {
    if (urlCenter && session && urlCenter !== session.centerSlug) {
      clearAdminAuth()
      resetCenterIdCache()
    }
  }, [urlCenter, session])

  useEffect(() => {
    const saved = loadRememberedAdminLogin()
    if (!saved) return
    setUsername(saved.loginId)
    setPassword(saved.password)
    setRememberLogin(true)
  }, [])

  if (isAdminAuthenticated()) {
    const active = getAdminSession()
    const from = (location.state as LoginLocationState | null)?.from?.pathname
    if (!urlCenter || urlCenter === active?.centerSlug) {
      if (active?.role === 'trainer') {
        return <Navigate to="/admin/members" replace />
      }
      return (
        <Navigate
          to={resolveAdminRedirect(active?.role ?? 'admin', from, nextPath)}
          replace
        />
      )
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.')
      return
    }

    const slug = needCenterSlug ? centerSlug.trim().toLowerCase() : undefined
    if (needCenterSlug && !slug) {
      setError('센터 주소를 입력해 주세요.')
      return
    }

    setLoading(true)
    try {
      const info = await loginAdmin(username, password, slug)
      if (info.centerSlug) saveRememberedAdminCenterSlug(info.centerSlug)
      setNeedCenterSlug(false)
      if (rememberLogin) {
        saveRememberedAdminLogin(username, password)
      } else {
        clearRememberedAdminLogin()
      }
      const fromState = (location.state as LoginLocationState | null)?.from?.pathname
      navigate(
        resolveAdminRedirect(info.role, fromState, nextPath),
        { replace: true },
      )
    } catch (err) {
      const message = getErrorMessage(err)
      if (message.includes('여러 센터')) {
        setNeedCenterSlug(true)
      }
      if (message.includes('센터를 찾을 수 없습니다')) {
        clearRememberedAdminCenterSlug()
        setNeedCenterSlug(true)
        if (!centerSlug) setCenterSlug('movel')
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MotionHubAuthShell
      title="관리자 · 트레이너 로그인"
      subtitle="모션허브에 등록한 아이디와 비밀번호만 입력하세요."
    >
      <section className={`${cardClass} card-pad`}>
        {!isSupabaseConfigured && (
          <p className="mb-3 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Supabase 연결 설정이 없습니다. Vercel 환경 변수{' '}
            <code className="text-xs">VITE_SUPABASE_URL</code>,{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code>를 확인해 주세요.
          </p>
        )}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-charcoal">아이디</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-charcoal">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          {needCenterSlug && (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-charcoal">센터 주소</span>
              <input
                type="text"
                value={centerSlug}
                onChange={(e) => setCenterSlug(e.target.value.toLowerCase())}
                className={inputClass}
                placeholder="abc-pt"
                autoComplete="organization"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-muted">
                동일한 아이디가 여러 센터에 있거나 센터를 찾지 못할 때 입력합니다. (모벨:
                movel)
              </p>
            </label>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal/80">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-gold/50 text-charcoal focus:ring-gold/40"
            />
            아이디·비밀번호 기억하기
          </label>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className={`w-full ${btnPrimary}`}
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      </section>

      <p className="text-center text-sm text-muted">
        아직 센터가 없으신가요?{' '}
        <Link to="/signup" className="font-semibold text-teal-700 hover:underline">
          센터 등록하기
        </Link>
      </p>

      <p className="text-center text-xs text-muted">
        <a href={getMemberPortalUrl()} className="text-teal-700 hover:underline">
          회원 페이지 →
        </a>
        <span className="mx-2">·</span>
        <Link to="/platform/login" className="text-teal-700 hover:underline">
          Super Admin
        </Link>
      </p>
    </MotionHubAuthShell>
  )
}
