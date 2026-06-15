import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchPlatformCenters,
  suspendPlatformCenter,
  type PlatformCenter,
} from '../../api/platformCenters'
import { btnOutline, btnPrimary, cardClass } from '../../styles/theme'

const STATUS_LABELS: Record<string, string> = {
  active: '운영 중',
  inactive: '비활성',
  suspended: '정지',
}

export default function PlatformHomePage() {
  const [centers, setCenters] = useState<PlatformCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  const loadCenters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchPlatformCenters()
      setCenters(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : '센터 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCenters()
  }, [loadCenters])

  async function handleSuspend(center: PlatformCenter) {
    if (center.status === 'suspended') return
    if (!window.confirm(`"${center.name}" 센터를 정지하시겠습니까?`)) return

    setActionId(center.id)
    try {
      await suspendPlatformCenter(center.id)
      await loadCenters()
    } catch (err) {
      setError(err instanceof Error ? err.message : '센터 정지에 실패했습니다.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">센터 목록</h1>
          <p className="mt-1 text-sm text-cream/60">
            MotionHub에 등록된 모든 센터를 관리합니다.
          </p>
        </div>
        <Link to="/platform/centers/new" className={btnPrimary}>
          + 새 센터 생성
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className={`${cardClass} overflow-hidden !border-white/10 !bg-[#161d26]`}>
        {loading ? (
          <p className="card-pad text-sm text-cream/60">불러오는 중…</p>
        ) : centers.length === 0 ? (
          <div className="card-pad text-center">
            <p className="text-sm text-cream/60">등록된 센터가 없습니다.</p>
            <Link to="/platform/centers/new" className={`mt-4 inline-block ${btnOutline}`}>
              첫 센터 만들기
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-cream/50">
                <tr>
                  <th className="px-4 py-3 font-medium">센터</th>
                  <th className="px-4 py-3 font-medium">코드</th>
                  <th className="px-4 py-3 font-medium">요금제</th>
                  <th className="px-4 py-3 font-medium">회원</th>
                  <th className="px-4 py-3 font-medium">트레이너</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((center) => (
                  <tr key={center.id} className="border-b border-white/5 text-cream/90">
                    <td className="px-4 py-3 font-medium text-white">{center.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{center.slug}</td>
                    <td className="px-4 py-3">{center.plan_code ?? '—'}</td>
                    <td className="px-4 py-3">{center.member_count}</td>
                    <td className="px-4 py-3">{center.trainer_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          center.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : center.status === 'suspended'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-white/10 text-cream/70'
                        }`}
                      >
                        {STATUS_LABELS[center.status] ?? center.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/login?center=${encodeURIComponent(center.slug)}`}
                          className="text-xs text-sky-300 hover:underline"
                        >
                          관리자 로그인
                        </Link>
                        {center.status !== 'suspended' && (
                          <button
                            type="button"
                            disabled={actionId === center.id}
                            onClick={() => void handleSuspend(center)}
                            className="text-xs text-red-300 hover:underline disabled:opacity-50"
                          >
                            정지
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
