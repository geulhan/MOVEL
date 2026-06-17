import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deletePlatformCenter,
  fetchPlatformCenters,
  suspendPlatformCenter,
  type PlatformCenter,
} from '../../api/platformCenters'
import { PlatformCenterAccountsModal } from '../../components/platform/PlatformCenterAccountsModal'
import { PlatformCenterCreditsModal } from '../../components/platform/PlatformCenterCreditsModal'
import { PlatformCenterServicePeriodModal } from '../../components/platform/PlatformCenterServicePeriodModal'
import {
  formatServicePeriod,
  getServicePeriodStatus,
} from '../../types/centerServicePeriod'
import { exportPlatformCentersExcel } from '../../lib/platformExcelExport'
import { btnOutline, btnPrimary, cardClass } from '../../styles/theme'

const STATUS_LABELS: Record<string, string> = {
  active: '운영 중',
  inactive: '승인 대기',
  suspended: '정지',
}

function periodBadgeClass(status: ReturnType<typeof getServicePeriodStatus>): string {
  switch (status) {
    case 'active':
    case 'unlimited':
      return 'bg-emerald-500/15 text-emerald-300'
    case 'suspended':
      return 'bg-red-500/15 text-red-300'
    case 'expired':
      return 'bg-amber-500/15 text-amber-300'
    case 'not_started':
      return 'bg-sky-500/15 text-sky-300'
    default:
      return 'bg-white/10 text-cream/70'
  }
}

function CenterActions({
  center,
  actionId,
  onAccounts,
  onPeriod,
  onCredits,
  onSuspend,
  onDelete,
}: {
  center: PlatformCenter
  actionId: string | null
  onAccounts: () => void
  onPeriod: () => void
  onCredits: () => void
  onSuspend: () => void
  onDelete: () => void
}) {
  const busy = actionId === center.id
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to={`/platform/centers/${center.id}`}
        className="text-xs font-semibold text-sky-300 hover:underline"
      >
        상세
      </Link>
      <button type="button" disabled={busy} onClick={onAccounts} className="text-xs text-sky-300 hover:underline disabled:opacity-50">
        계정
      </button>
      <button type="button" disabled={busy} onClick={onPeriod} className="text-xs text-violet-300 hover:underline disabled:opacity-50">
        이용 기간
      </button>
      <button type="button" disabled={busy} onClick={onCredits} className="text-xs text-emerald-300 hover:underline disabled:opacity-50">
        크레딧
      </button>
      {center.status !== 'suspended' && center.slug !== 'movel' && (
        <button type="button" disabled={busy} onClick={onSuspend} className="text-xs text-amber-300 hover:underline disabled:opacity-50">
          정지
        </button>
      )}
      {center.slug !== 'movel' && (
        <button type="button" disabled={busy} onClick={onDelete} className="text-xs text-red-300 hover:underline disabled:opacity-50">
          삭제
        </button>
      )}
    </div>
  )
}

export default function PlatformCentersPage() {
  const [centers, setCenters] = useState<PlatformCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [periodCenter, setPeriodCenter] = useState<PlatformCenter | null>(null)
  const [accountsCenter, setAccountsCenter] = useState<PlatformCenter | null>(null)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [creditsFocusId, setCreditsFocusId] = useState<string | null>(null)

  const loadCenters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCenters(await fetchPlatformCenters())
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

  async function handleDelete(center: PlatformCenter) {
    if (center.slug === 'movel') return
    const typed = window.prompt(
      `삭제하려면 센터 코드를 입력하세요.\n\n센터: ${center.name}\n코드: ${center.slug}`,
      '',
    )
    if (typed === null) return
    if (typed.trim().toLowerCase() !== center.slug) {
      setError('센터 코드가 일치하지 않아 삭제가 취소되었습니다.')
      return
    }
    if (!window.confirm(`"${center.name}" 센터를 삭제하시겠습니까?`)) return
    setActionId(center.id)
    try {
      await deletePlatformCenter(center.id, typed)
      await loadCenters()
    } catch (err) {
      setError(err instanceof Error ? err.message : '센터 삭제에 실패했습니다.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">센터 목록</h1>
          <p className="mt-1 text-sm text-cream/60">등록된 센터를 조회·관리합니다. (읽기 중심)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exportPlatformCentersExcel(centers)} disabled={loading || centers.length === 0} className={btnOutline}>
            엑셀
          </button>
          <button type="button" onClick={() => { setCreditsFocusId(null); setCreditsOpen(true) }} className={btnOutline}>
            크레딧
          </button>
          <Link to="/platform/centers/new" className={btnPrimary}>+ 생성</Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-cream/60">불러오는 중…</p>
      ) : centers.length === 0 ? (
        <p className="text-sm text-cream/60">등록된 센터가 없습니다.</p>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {centers.map((center) => {
              const periodStatus = getServicePeriodStatus(center.status, center.servicePeriod)
              return (
                <article key={center.id} className={`${cardClass} !border-white/10 !bg-[#161d26] p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/platform/centers/${center.id}`} className="text-base font-semibold text-white hover:underline">
                        {center.name}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-cream/50">{center.slug}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${periodBadgeClass(periodStatus)}`}>
                      {STATUS_LABELS[center.status] ?? center.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-cream/70">
                    <div><dt className="text-cream/45">회원</dt><dd className="font-semibold text-white">{center.member_count}</dd></div>
                    <div><dt className="text-cream/45">트레이너</dt><dd className="font-semibold text-white">{center.trainer_count}</dd></div>
                    <div><dt className="text-cream/45">크레딧</dt><dd className="font-semibold text-emerald-300">{center.messageCredits?.balance.toLocaleString() ?? 0}</dd></div>
                    <div><dt className="text-cream/45">이번 달</dt><dd>{center.messageCredits?.monthUsed.toLocaleString() ?? 0}건</dd></div>
                  </dl>
                  <p className="mt-2 text-[11px] text-cream/50">{formatServicePeriod(center.servicePeriod)}</p>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <CenterActions
                      center={center}
                      actionId={actionId}
                      onAccounts={() => setAccountsCenter(center)}
                      onPeriod={() => setPeriodCenter(center)}
                      onCredits={() => { setCreditsFocusId(center.id); setCreditsOpen(true) }}
                      onSuspend={() => void handleSuspend(center)}
                      onDelete={() => void handleDelete(center)}
                    />
                  </div>
                </article>
              )
            })}
          </div>

          <section className={`${cardClass} hidden overflow-hidden !border-white/10 !bg-[#161d26] md:block`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-cream/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">센터</th>
                    <th className="px-4 py-3 font-medium">코드</th>
                    <th className="px-4 py-3 font-medium">회원</th>
                    <th className="px-4 py-3 font-medium">메시지</th>
                    <th className="px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {centers.map((center) => (
                    <tr key={center.id} className="border-b border-white/5 text-cream/90">
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/platform/centers/${center.id}`} className="text-white hover:underline">{center.name}</Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{center.slug}</td>
                      <td className="px-4 py-3">{center.member_count}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-emerald-300">
                        {center.messageCredits?.balance.toLocaleString() ?? 0} / {center.messageCredits?.monthUsed.toLocaleString() ?? 0}
                      </td>
                      <td className="px-4 py-3">{STATUS_LABELS[center.status] ?? center.status}</td>
                      <td className="px-4 py-3">
                        <CenterActions
                          center={center}
                          actionId={actionId}
                          onAccounts={() => setAccountsCenter(center)}
                          onPeriod={() => setPeriodCenter(center)}
                          onCredits={() => { setCreditsFocusId(center.id); setCreditsOpen(true) }}
                          onSuspend={() => void handleSuspend(center)}
                          onDelete={() => void handleDelete(center)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {accountsCenter && <PlatformCenterAccountsModal center={accountsCenter} onClose={() => setAccountsCenter(null)} />}
      {periodCenter && <PlatformCenterServicePeriodModal center={periodCenter} onClose={() => setPeriodCenter(null)} onSaved={() => void loadCenters()} />}
      <PlatformCenterCreditsModal open={creditsOpen} focusCenterId={creditsFocusId} onClose={() => { setCreditsOpen(false); setCreditsFocusId(null); void loadCenters() }} />
    </div>
  )
}
