import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchKpiDashboard,
  type KpiDashboardData,
} from '../../api/kpi'
import { formatCurrency, formatDate } from '../../api/members'
import { formatSupabaseError } from '../../lib/errors'
import { KpiCard } from './KpiCard'
import { SimpleTrendChart } from './SimpleTrendChart'
import type { RenewalFilter } from '../../utils/renewal'

function formatPercent(value: number | null, suffix = '%'): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}${suffix}`
}

function formatDaysLeft(days: number | null): string {
  if (days === null) return '—'
  if (days < 0) return `D+${Math.abs(days)}`
  if (days === 0) return 'D-Day'
  return `D-${days}`
}

export function OperationalKpiDashboard() {
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

  if (loading) {
    return (
      <section className="card card-pad">
        <p className="text-sm text-muted">운영 KPI 불러오는 중…</p>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="card card-pad">
        <h2 className="text-sm font-semibold text-charcoal">운영 KPI</h2>
        <p className="mt-2 text-sm text-red-800">
          {error ?? 'KPI 데이터를 불러올 수 없습니다.'}
        </p>
      </section>
    )
  }

  const salesChangeLabel =
    data.sales.changePercent === null
      ? '전월 데이터 없음'
      : `전월 대비 ${formatPercent(data.sales.changePercent)}`

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-charcoal">운영 KPI</h2>
        <p className="mt-0.5 text-xs text-muted">
          회원 앱 사용률·재등록·참여·매출을 한눈에 확인합니다.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-charcoal/70">회원 현황</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <KpiCard label="총 회원 수" value={`${data.members.total}명`} />
          <KpiCard
            label="활성 회원 수"
            value={`${data.members.active}명`}
            sub="잔여 세션 > 0 또는 이용기간 내"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-charcoal/70">앱 사용률</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="최근 7일 로그인"
            value={`${data.appUsage.login7d}명`}
          />
          <KpiCard
            label="최근 30일 로그인"
            value={`${data.appUsage.login30d}명`}
          />
          <KpiCard
            label="로그인 비율"
            value={`${data.appUsage.loginRatePercent}%`}
            sub="30일 로그인 ÷ 활성 회원"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-charcoal/70">참여율</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="7일 걸음 인증"
            value={`${data.engagement.step7d}명`}
          />
          <KpiCard
            label="30일 걸음 인증"
            value={`${data.engagement.step30d}명`}
          />
          <KpiCard
            label="7일 운동일지"
            value={`${data.engagement.journal7d}명`}
          />
          <KpiCard
            label="30일 운동일지"
            value={`${data.engagement.journal30d}명`}
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-charcoal/70">재등록 관리</h3>
        <p className="mt-0.5 text-[10px] text-muted">카드 클릭 시 회원 목록으로 이동</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="만료 D-14 이하"
            value={`${data.renewal.expiring14}명`}
            onClick={() => goMembers('expiring14')}
            accent="border-gold/60 bg-cream"
          />
          <KpiCard
            label="잔여 세션 5회 이하"
            value={`${data.renewal.lowSessions}명`}
            onClick={() => goMembers('renewal')}
            accent="border-yellow-400/50 bg-yellow-50/80"
          />
          <KpiCard
            label="재등록 우선관리"
            value={`${data.renewal.priority}명`}
            sub="D-14 이하 또는 잔여 5회 이하"
            onClick={() => goMembers('renewal-priority')}
            accent="border-orange-400/50 bg-orange-50/80"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-charcoal/70">매출</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="이번 달 결제"
            value={formatCurrency(data.sales.thisMonth)}
          />
          <KpiCard
            label="지난 달 결제"
            value={formatCurrency(data.sales.lastMonth)}
          />
          <KpiCard
            label="증감률"
            value={formatPercent(data.sales.changePercent)}
            sub={salesChangeLabel}
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-charcoal/70">알림 (최근 7일)</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="알림톡 발송" value={`${data.notifications.sent7d}건`} />
          <KpiCard label="실패" value={`${data.notifications.failed7d}건`} />
          <KpiCard
            label="실패율"
            value={`${data.notifications.failRatePercent}%`}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SimpleTrendChart
          title="최근 30일 로그인 수"
          points={data.trends.logins30d}
          color="#c9a227"
        />
        <SimpleTrendChart
          title="최근 30일 걸음 인증 수"
          points={data.trends.steps30d}
          color="#4a6741"
        />
      </div>

      {data.renewalRiskTop10.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-charcoal">
              재등록 위험 회원 TOP 10
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              D-Day → 잔여 세션 순 · 행 클릭 시 회원 상세
            </p>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2">회원명</th>
                  <th className="px-4 py-2">잔여 세션</th>
                  <th className="px-4 py-2">만료 D-Day</th>
                  <th className="px-4 py-2">최근 출석일</th>
                  <th className="px-4 py-2">총 결제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {data.renewalRiskTop10.map((row) => (
                  <tr
                    key={row.member_id}
                    className="cursor-pointer hover:bg-gold/5"
                    onClick={() => navigate(`/admin/member/${row.member_id}`)}
                  >
                    <td className="max-w-[8rem] truncate px-4 py-3 font-medium">
                      {row.member_name}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.remaining_sessions}회
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatDaysLeft(row.days_left)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted tabular-nums">
                      {row.last_attendance_at
                        ? formatDate(row.last_attendance_at)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatCurrency(row.total_payment_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
