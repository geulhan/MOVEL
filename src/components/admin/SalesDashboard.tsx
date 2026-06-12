import { useEffect, useState } from 'react'
import {
  currentMonthLabel,
  fetchRecentPayments,
  fetchSalesStats,
  type RecentPayment,
  type SalesStats,
} from '../../api/sales'
import { formatCurrency, formatDate } from '../../api/members'

export function SalesDashboard() {
  const [stats, setStats] = useState<SalesStats | null>(null)
  const [recent, setRecent] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [s, r] = await Promise.all([
          fetchSalesStats(),
          fetchRecentPayments(),
        ])
        setStats(s)
        setRecent(r)
      } catch {
        setStats(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <section className="card card-pad">
        <p className="text-sm text-muted">매출 정보 불러오는 중…</p>
      </section>
    )
  }

  if (!stats) {
    return (
      <section className="card card-pad">
        <p className="text-sm text-muted">
          매출 데이터를 불러올 수 없습니다. payment_history 테이블을 확인해
          주세요.
        </p>
      </section>
    )
  }

  const cards = [
    {
      label: `${currentMonthLabel()} 매출`,
      value: formatCurrency(stats.monthRevenue),
      sub: `${stats.monthPaymentCount}건`,
    },
    {
      label: '1년 매출',
      value: formatCurrency(stats.yearRevenue),
      sub: `최근 12개월 · ${stats.yearPaymentCount}건`,
    },
    {
      label: '활성 회원',
      value: `${stats.activeMemberCount}명`,
      sub: '상태 활성',
    },
    {
      label: '회원당 평균',
      value: formatCurrency(stats.avgPerMember),
      sub: '1년 ÷ 활성',
    },
  ]

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="card min-w-0 card-pad"
          >
            <p className="truncate text-xs font-medium text-charcoal/55">
              {c.label}
            </p>
            <p className="stat-value truncate">{c.value}</p>
            <p className="mt-1 truncate text-xs text-muted">{c.sub}</p>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-charcoal">최근 결제</h3>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2">회원</th>
                  <th className="px-4 py-2">결제일</th>
                  <th className="px-4 py-2">금액</th>
                  <th className="px-4 py-2">PT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td className="max-w-[6rem] truncate px-4 py-3 font-medium">
                      {p.member_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted tabular-nums">
                      {formatDate(p.paid_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {p.sessions}회
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
