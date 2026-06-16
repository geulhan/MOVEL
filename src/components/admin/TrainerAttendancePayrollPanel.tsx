import { Link } from 'react-router-dom'
import { formatMonthLabel, type MonthRef } from '../../api/attendance'
import { formatCurrency } from '../../api/members'
import type { AttendancePayrollSummary } from '../../lib/attendancePayroll'
import { btnOutline, cardClass } from '../../styles/theme'

type Props = {
  monthRef: MonthRef
  summary: AttendancePayrollSummary | null
  loading: boolean
}

export function TrainerAttendancePayrollPanel({
  monthRef,
  summary,
  loading,
}: Props) {
  const monthLabel = formatMonthLabel(monthRef)

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/15 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-charcoal">
            트레이너별 수업·수업료
          </h3>
          <p className="mt-1 text-xs text-muted">
            {monthLabel} 출석 기준 · 회원 단가(결제금액 ÷ 총 PT) × 출석 횟수로
            소진 매출을 계산하고, 트레이너 수업료 비율을 적용합니다.
          </p>
        </div>
        <Link to="/admin/analytics" className={`${btnOutline} text-xs`}>
          수업료 비율 설정
        </Link>
      </div>

      {loading ? (
        <p className="px-5 py-6 text-sm text-muted">집계 중…</p>
      ) : !summary || summary.byTrainer.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          {monthLabel} 출석 기록이 없습니다.
        </p>
      ) : (
        <>
          <div className="grid gap-3 border-b border-gold/15 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted">총 출석</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-charcoal">
                {summary.totalSessions}회
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">소진 매출</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-charcoal">
                {formatCurrency(summary.totalGross)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">
                트레이너 수업료 ({summary.settlementRate}%)
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                {formatCurrency(summary.totalTrainerPay)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">센터 몫</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-sky-700">
                {formatCurrency(summary.totalCenterShare)}
              </p>
            </div>
          </div>

          <div className="table-scroll">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5">트레이너</th>
                  <th className="px-4 py-2.5">수업 횟수</th>
                  <th className="px-4 py-2.5">소진 매출</th>
                  <th className="px-4 py-2.5">트레이너 수업료</th>
                  <th className="px-4 py-2.5">센터 몫</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {summary.byTrainer.map((row) => (
                  <tr key={row.trainerName} className="hover:bg-cream/40">
                    <td className="px-4 py-3 font-medium text-charcoal">
                      {row.trainerName}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.sessionCount}회</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(row.grossAmount)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700">
                      {formatCurrency(row.trainerPay)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-sky-700">
                      {formatCurrency(row.centerShare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
