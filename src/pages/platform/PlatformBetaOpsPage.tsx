import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBetaCentersForPlatform } from '../../api/platformDashboard'
import type { BetaCenterRow } from '../../types/platformOps'
import { PlatformSection } from '../../components/platform/PlatformOpsUi'
import { btnOutline } from '../../styles/theme'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return String(iso).slice(0, 10)
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export default function PlatformBetaOpsPage() {
  const [centers, setCenters] = useState<BetaCenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCenters(await fetchBetaCentersForPlatform())
    } catch (err) {
      setError(err instanceof Error ? err.message : '베타 센터 목록을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const now = Date.now()
  const inactive7 = centers.filter(
    (c) => now - new Date(c.last_activity_at).getTime() > 7 * 86_400_000,
  )
  const inactive14 = centers.filter(
    (c) => now - new Date(c.last_activity_at).getTime() > 14 * 86_400_000,
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">베타 운영</h1>
        <p className="mt-1 text-sm text-cream/60">베타·승인 대기 센터의 이용 기간과 접속 현황</p>
      </div>

      {error && <p className="text-sm text-red-200">{error}</p>}

      {(inactive7.length > 0 || inactive14.length > 0) && (
        <PlatformSection title="알림">
          <div className="grid gap-3 sm:grid-cols-2">
            {inactive7.length > 0 && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-50">
                <strong>7일 미접속 {inactive7.length}곳</strong>
                <p className="mt-1 text-xs text-amber-100/80">온보딩·지원 연락 검토</p>
              </div>
            )}
            {inactive14.length > 0 && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-50">
                <strong>14일 미접속 {inactive14.length}곳</strong>
                <p className="mt-1 text-xs text-red-100/80">이탈 위험 — 우선 확인</p>
              </div>
            )}
          </div>
        </PlatformSection>
      )}

      <PlatformSection title="베타 센터 목록">
        {loading ? (
          <p className="text-sm text-cream/60">불러오는 중…</p>
        ) : centers.length === 0 ? (
          <p className="text-sm text-cream/60">베타 센터가 없습니다.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {centers.map((c) => {
              const daysSince = Math.floor(
                (now - new Date(c.last_activity_at).getTime()) / 86_400_000,
              )
              const warn = daysSince >= 14 ? 'border-red-400/40' : daysSince >= 7 ? 'border-amber-400/40' : 'border-white/10'
              return (
                <article key={c.id} className={`rounded-xl border bg-[#161d26] p-4 ${warn}`}>
                  <Link to={`/platform/centers/${c.id}`} className="text-base font-semibold text-white hover:underline">
                    {c.name}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-cream/50">{c.slug}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-cream/70">
                    <div><dt className="text-cream/45">이용 시작</dt><dd>{formatDate(c.service_starts_at)}</dd></div>
                    <div><dt className="text-cream/45">베타 종료</dt><dd>{formatDate(c.service_ends_at)}</dd></div>
                    <div><dt className="text-cream/45">잔여 일수</dt><dd className="font-semibold text-white">{c.days_remaining ?? '—'}일</dd></div>
                    <div><dt className="text-cream/45">마지막 활동</dt><dd>{formatWhen(c.last_activity_at)}</dd></div>
                  </dl>
                  {daysSince >= 7 && (
                    <p className="mt-2 text-[11px] text-amber-200">{daysSince}일 전 접속</p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </PlatformSection>

      <button type="button" onClick={() => void load()} className={btnOutline}>새로고침</button>
    </div>
  )
}
