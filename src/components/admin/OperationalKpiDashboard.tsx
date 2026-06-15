import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchKpiDashboard,
  type KpiDashboardData,
} from '../../api/kpi'
import { formatCurrency, formatDate } from '../../api/members'
import { formatSupabaseError } from '../../lib/errors'
import { KpiCard } from './KpiCard'
import { KpiSection } from './KpiSection'
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
    <section className="card overflow-hidden">
      <div className="border-b border-gold/25 bg-cream/35 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-charcoal">운영 KPI</h2>
        <p className="mt-0.5 text-xs text-muted">
          회원 앱 사용률·재등록·참여·매출을 한눈에 확인합니다.
        </p>
      </div>

      <div className="space-y-5 p-5 sm:space-y-6 sm:p-6">
        {/* 핵심 지표 — 4열 균등 */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="활성 회원"
            value={`${data.members.active}명`}
            sub={`전체 ${data.members.total}명`}
            size="lg"
            highlight
          />
          <KpiCard
            label="30일 로그인"
            value={`${data.appUsage.login30d}명`}
            sub={`7일 ${data.appUsage.login7d}명`}
            size="lg"
            highlight
          />
          <KpiCard
            label="로그인 비율"
            value={`${data.appUsage.loginRatePercent}%`}
            sub="30일 로그인 ÷ 활성"
            size="lg"
            highlight
          />
          <KpiCard
            label="재등록 우선관리"
            value={`${data.renewal.priority}명`}
            sub="D-14 이하 또는 잔여 5회 이하"
            size="lg"
            highlight
            onClick={() => goMembers('renewal-priority')}
            className="border-orange-300/45 bg-orange-50/60 hover:bg-orange-50"
          />
        </div>

        {/* 사용·참여 | 재등록·매출·알림 */}
        <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
          <div className="space-y-5 rounded-xl border border-gold/20 bg-cream/20 p-4 sm:p-5">
            <KpiSection title="앱 사용률">
              <div className="grid grid-cols-3 gap-3">
                <KpiCard
                  label="7일 로그인"
                  value={`${data.appUsage.login7d}명`}
                  size="sm"
                />
                <KpiCard
                  label="30일 로그인"
                  value={`${data.appUsage.login30d}명`}
                  size="sm"
                />
                <KpiCard
                  label="로그인 비율"
                  value={`${data.appUsage.loginRatePercent}%`}
                  size="sm"
                />
              </div>
            </KpiSection>

            <KpiSection title="참여율">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label="7일 걸음"
                  value={`${data.engagement.step7d}명`}
                  size="sm"
                />
                <KpiCard
                  label="30일 걸음"
                  value={`${data.engagement.step30d}명`}
                  size="sm"
                />
                <KpiCard
                  label="7일 일지"
                  value={`${data.engagement.journal7d}명`}
                  size="sm"
                />
                <KpiCard
                  label="30일 일지"
                  value={`${data.engagement.journal30d}명`}
                  size="sm"
                />
              </div>
            </KpiSection>
          </div>

          <div className="space-y-5 rounded-xl border border-gold/20 bg-white/60 p-4 sm:p-5">
            <KpiSection
              title="재등록 관리"
              hint="카드 클릭 → 회원 목록"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard
                  label="D-14 이하"
                  value={`${data.renewal.expiring14}명`}
                  size="sm"
                  onClick={() => goMembers('expiring14')}
                  accent="border-gold/50 bg-cream/80"
                />
                <KpiCard
                  label="잔여 5회 이하"
                  value={`${data.renewal.lowSessions}명`}
                  size="sm"
                  onClick={() => goMembers('renewal')}
                  accent="border-yellow-400/45 bg-yellow-50/70"
                />
                <KpiCard
                  label="우선관리"
                  value={`${data.renewal.priority}명`}
                  size="sm"
                  onClick={() => goMembers('renewal-priority')}
                  accent="border-orange-400/45 bg-orange-50/70"
                />
              </div>
            </KpiSection>

            <KpiSection title="매출">
              <div className="grid grid-cols-3 gap-3">
                <KpiCard
                  label="이번 달"
                  value={formatCurrency(data.sales.thisMonth)}
                  size="sm"
                />
                <KpiCard
                  label="지난 달"
                  value={formatCurrency(data.sales.lastMonth)}
                  size="sm"
                />
                <KpiCard
                  label="증감률"
                  value={formatPercent(data.sales.changePercent)}
                  sub={salesChangeLabel}
                  size="sm"
                />
              </div>
            </KpiSection>

            <KpiSection title="알림 (7일)">
              <div className="grid grid-cols-3 gap-3">
                <KpiCard
                  label="발송"
                  value={`${data.notifications.sent7d}건`}
                  size="sm"
                />
                <KpiCard
                  label="실패"
                  value={`${data.notifications.failed7d}건`}
                  size="sm"
                />
                <KpiCard
                  label="실패율"
                  value={`${data.notifications.failRatePercent}%`}
                  size="sm"
                />
              </div>
            </KpiSection>
          </div>
        </div>

        {/* 추세 차트 */}
        <KpiSection title="최근 30일 추세">
          <div className="grid gap-3 md:grid-cols-2">
            <SimpleTrendChart
              title="로그인"
              points={data.trends.logins30d}
              color="#c9a227"
            />
            <SimpleTrendChart
              title="걸음 인증"
              points={data.trends.steps30d}
              color="#4a6741"
            />
          </div>
        </KpiSection>

        {data.renewalRiskTop10.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gold/25 bg-white">
            <div className="border-b border-gold/20 bg-cream/25 px-4 py-3 sm:px-5">
              <h3 className="text-sm font-semibold text-charcoal">
                재등록 위험 회원 TOP 10
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                D-Day → 잔여 세션 순 · 행 클릭 시 회원 상세
              </p>
            </div>
            <div className="table-scroll px-4 sm:px-5">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-2 py-2 sm:px-3">회원명</th>
                    <th className="px-2 py-2 sm:px-3">잔여</th>
                    <th className="px-2 py-2 sm:px-3">D-Day</th>
                    <th className="px-2 py-2 sm:px-3">최근 출석</th>
                    <th className="px-2 py-2 sm:px-3">총 결제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/15">
                  {data.renewalRiskTop10.map((row) => (
                    <tr
                      key={row.member_id}
                      className="cursor-pointer hover:bg-gold/5"
                      onClick={() => navigate(`/admin/member/${row.member_id}`)}
                    >
                      <td className="max-w-[7rem] truncate px-2 py-2.5 font-medium sm:max-w-[9rem] sm:px-3 sm:py-3">
                        {row.member_name}
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap tabular-nums sm:px-3 sm:py-3">
                        {row.remaining_sessions}회
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap tabular-nums sm:px-3 sm:py-3">
                        {formatDaysLeft(row.days_left)}
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-muted tabular-nums sm:px-3 sm:py-3">
                        {row.last_attendance_at
                          ? formatDate(row.last_attendance_at)
                          : '—'}
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap tabular-nums sm:px-3 sm:py-3">
                        {formatCurrency(row.total_payment_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
