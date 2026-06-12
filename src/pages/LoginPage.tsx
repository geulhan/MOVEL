import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginAdmin } from '../api/adminAuth'
import { formatSupabaseError } from '../lib/errors'
import { getAdminSession, isAdminAuthenticated } from '../lib/adminSession'
import {
  clearRememberedAdminLogin,
  loadRememberedAdminLogin,
  saveRememberedAdminLogin,
} from '../lib/rememberLogin'
import { MovelBrandHeader } from '../components/brand/MovelBrandHeader'
import { btnPrimary, cardClass, inputClass } from '../styles/theme'

type LoginLocationState = {
  from?: { pathname: string }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberLogin, setRememberLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = loadRememberedAdminLogin()
    if (!saved) return
    setUsername(saved.loginId)
    setPassword(saved.password)
    setRememberLogin(true)
  }, [])

  if (isAdminAuthenticated()) {
    const session = getAdminSession()
    const from = (location.state as LoginLocationState | null)?.from?.pathname
    if (session?.role === 'trainer') {
      return <Navigate to="/admin/members" replace />
    }
    return (
      <Navigate
        to={from && from.startsWith('/admin') ? from : '/admin'}
        replace
      />
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.')
      return
    }

    setLoading(true)
    try {
      const info = await loginAdmin(username, password)
      if (rememberLogin) {
        saveRememberedAdminLogin(username, password)
      } else {
        clearRememberedAdminLogin()
      }
      const fromState = (location.state as LoginLocationState | null)?.from?.pathname
      const target =
        info.role === 'trainer'
          ? '/admin/members'
          : fromState && fromState.startsWith('/admin')
            ? fromState
            : '/admin'
      navigate(target, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : formatSupabaseError(err),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <MovelBrandHeader band="dark" size="lg" linkTo="/" />
      <div className="mx-auto max-w-md space-y-4 px-4 py-8">
        <section className={`${cardClass} card-pad`}>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">
            Admin
          </p>
          <h1 className="mt-1 text-xl font-bold text-charcoal">
            관리자 · 트레이너 로그인
          </h1>
          <p className="mt-2 text-sm text-muted">
            관리자는 전체 메뉴, 트레이너는 회원 관리·PT 스케줄만 이용할 수
            있습니다.
          </p>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-charcoal">
                아이디
              </span>
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
              <span className="mb-1.5 block font-medium text-charcoal">
                비밀번호
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                disabled={loading}
              />
            </label>

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

        <p className="text-center text-xs text-muted">
          <Link to="/member" className="text-gold-dark hover:underline">
            회원 페이지 →
          </Link>
        </p>
      </div>
    </div>
  )
}
