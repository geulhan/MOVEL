import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTrainers } from '../api/trainers'
import { MovelBrandHeader } from '../components/brand/MovelBrandHeader'
import { MovelLogo } from '../components/brand/MovelLogo'
import { AttendanceBook } from '../components/admin/AttendanceBook'
import { formatSupabaseError } from '../lib/errors'
import {
  clearTrainerSession,
  getTrainerSession,
  saveTrainerSession,
} from '../lib/staffSession'
import type { Trainer } from '../types/database'
import { btnPrimary, cardClass, inputClass } from '../styles/theme'

export default function TrainerPortalPage() {
  const [session, setSession] = useState(() => getTrainerSession())
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [trainerId, setTrainerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchTrainers()
        setTrainers(data)
      } catch (err) {
        setLoginError(formatSupabaseError(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function handleLogin() {
    setLoginError(null)
    const trainer = trainers.find((t) => t.id === trainerId)
    if (!trainer) {
      setLoginError('트레이너를 선택해 주세요.')
      return
    }
    saveTrainerSession(trainer.id, trainer.name)
    setSession({ trainerId: trainer.id, trainerName: trainer.name })
  }

  function handleLogout() {
    clearTrainerSession()
    setSession(null)
    setTrainerId('')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-sm text-muted">불러오는 중…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-cream">
        <MovelBrandHeader band="dark" size="md" linkTo="/" />
        <div className="mx-auto max-w-md space-y-4 px-4 py-8">
          <section className={`${cardClass} card-pad`}>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">
              Trainer
            </p>
            <h1 className="mt-1 text-xl font-bold text-charcoal">
              트레이너 출석부
            </h1>
            <p className="mt-2 text-sm text-muted">
              담당 회원 출석 처리만 가능합니다. 출석 취소·수정은 관리자만 할 수
              있습니다.
            </p>
            <div className="mt-5 space-y-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-charcoal">
                  트레이너 선택
                </span>
                <select
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">선택하세요</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleLogin}
                disabled={!trainerId}
                className={`w-full ${btnPrimary}`}
              >
                출석부 열기
              </button>
              {loginError && (
                <p className="text-sm text-red-700">{loginError}</p>
              )}
            </div>
          </section>
          <p className="text-center text-xs text-muted">
            <Link to="/admin" className="text-gold-dark hover:underline">
              관리자 페이지 →
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-gold/30 bg-charcoal">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MovelLogo
              tone="cream"
              className="hidden h-9 w-auto shrink-0 sm:block"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                Trainer
              </p>
              <h1 className="truncate text-sm font-bold text-cream">
                {session.trainerName} · 출석부
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/admin"
              className="rounded-lg border border-cream/20 px-3 py-1.5 text-xs text-cream/80 hover:bg-charcoal-light"
            >
              관리자
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-medium text-gold"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <AttendanceBook
          role="trainer"
          trainerId={session.trainerId}
          trainerName={session.trainerName}
        />
      </main>
    </div>
  )
}
