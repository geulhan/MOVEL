import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchKpiDashboard, type KpiDashboardData } from '../../api/kpi'
import { formatCurrency } from '../../api/members'
import { formatSupabaseError } from '../../lib/errors'
import type { RenewalFilter } from '../../utils/renewal'

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}%`
}

type WidgetProps = {
  label: string
  value: string
  sub?: string
  onClick?: () => void
  accent?: string
}

function KpiWidget({ label, value, sub, onClick, accent }: WidgetProps) {
  const className = [
    'rounded-xl border border-gold/30 bg-white px-3 py-2.5 text-left transition',
    accent ?? '',
    onClick ? 'cursor-pointer hover:border-gold/55 hover:shadow-sm' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      <p className="truncate text-[10px] font-medium text-charcoal/50">{label}</p>
      <p className="mt-0.5 truncate text-base font-bold tabular-nums text-charcoal">
        {value}
      </p>
      {sub ? <p className="mt-0.5 truncate text-[10px] text-muted">{sub}</p> : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    )
  }
  return <div className={className}>{inner}</div>
}

export function OperationalKpiSidebar() {
  const navigate = useNavigate()
  const [data, setData] = useState<KpiDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const kpi = await fetchKpiDashboard()
        setData(kpi)
        setError(null)
      } catch (err) {
        setData(null)
        setError(formatSupabaseError(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function goMembers(filter: RenewalFilter) {
    navigate(`/admin/members?filter=${filter}`)
  }

  return (
    <aside className="card overflow-hidden">
      <div className="border-b border-gold/25 bg-cream/40 px-4 py-3">
        <h2 className="text-xs font-semibold text-charcoal">운영 KPI</h2>
        <p className="mt-0.5 text-[10px] text-muted">실시간 현황</p>
      </div>

      <div className="space-y-2 p-3">
        {loading ? (
          <p className="py-6 text-center text-xs text-muted">불러오는 중…</p>
        ) : error || !data ? (
          <p className="py-4 text-xs text-red-800">
            {error ?? 'KPI를 불러올 수 없습니다.'}
          </p>
        ) : (
          <>
            <KpiWidget
              label="활성 회원"
              value={`${data.members.active}명`}
              sub={`전체 ${data.members.total}명`}
            />
            <KpiWidget
              label="30일 로그인"
              value={`${data.appUsage.login30d}명`}
              sub={`7일 ${data.appUsage.login7d}명 · ${data.appUsage.loginRatePercent}%`}
            />
            <KpiWidget
              label="재등록 우선"
              value={`${data.renewal.priority}명`}
              sub="D-14 또는 잔여 5회 이하"
              onClick={() => goMembers('renewal-priority')}
              accent="border-orange-300/40 bg-orange-50/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <KpiWidget
                label="7일 걸음"
                value={`${data.engagement.step7d}`}
                sub="인증 회원"
              />
              <KpiWidget
                label="7일 일지"
                value={`${data.engagement.journal7d}`}
                sub="작성 회원"
              />
            </div>
            <KpiWidget
              label="이번 달 매출"
              value={formatCurrency(data.sales.thisMonth)}
              sub={formatPercent(data.sales.changePercent) + ' 전월'}
            />
            <div className="grid grid-cols-2 gap-2">
              <KpiWidget
                label="알림 발송"
                value={`${data.notifications.sent7d}`}
                sub="7일"
              />
              <KpiWidget
                label="실패율"
                value={`${data.notifications.failRatePercent}%`}
                sub={`실패 ${data.notifications.failed7d}`}
              />
            </div>

            {data.renewalRiskTop10.length > 0 && (
              <div className="mt-2 border-t border-gold/20 pt-2">
                <p className="mb-1.5 text-[10px] font-semibold text-charcoal/60">
                  재등록 위험 TOP 3
                </p>
                <ul className="space-y-1">
                  {data.renewalRiskTop10.slice(0, 3).map((row) => (
                    <li key={row.member_id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/member/${row.member_id}`)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition hover:bg-cream/80"
                      >
                        <span className="truncate font-medium text-charcoal">
                          {row.member_name}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted">
                          {row.remaining_sessions}회
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
