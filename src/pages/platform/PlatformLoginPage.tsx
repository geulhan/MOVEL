import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginPlatformAdmin } from '../../api/platformAuth'
import { PlatformGuestOnly } from '../../components/PlatformAccessGuard'
import { btnPrimary, cardClass, inputClass } from '../../styles/theme'

export default function PlatformLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginPlatformAdmin(username, password)
      navigate('/platform', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PlatformGuestOnly>
      <div className="min-h-screen bg-[#0f1419] px-4 py-10 text-cream">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/40">
              MotionHub
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">Super Admin</h1>
            <p className="mt-2 text-sm text-cream/60">
              플랫폼 관리자 전용 로그인입니다.
            </p>
          </div>

          <section className={`${cardClass} card-pad !border-white/10 !bg-[#161d26]`}>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-cream">아이디</span>
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
                <span className="mb-1.5 block font-medium text-cream">비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </label>

              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className={`w-full ${btnPrimary}`}
              >
                {loading ? '로그인 중…' : '플랫폼 로그인'}
              </button>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>
          </section>

          <p className="mt-4 text-center text-xs text-cream/50">
            <Link to="/login" className="hover:text-cream">
              센터 관리자 로그인 →
            </Link>
          </p>
        </div>
      </div>
    </PlatformGuestOnly>
  )
}