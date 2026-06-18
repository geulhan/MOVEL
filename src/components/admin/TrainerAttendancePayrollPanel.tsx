import { Link } from 'react-router-dom'
import { formatMonthLabel, type MonthRef } from '../../api/attendance'
import { formatCurrency } from '../../api/members'
import type { AttendancePayrollSummary } from '../../lib/attendancePayroll'
import { btnOutline, cardClass } from '../../styles/theme'

type Props = {
  monthRef: MonthRef
  summary: AttendancePayrollSummary | null
  loading: boolean
  trainerView?: boolean
  trainerName?: string | null
}

export function TrainerAttendancePayrollPanel({
  monthRef,
  summary,
  loading,
  trainerView = false,
  trainerName,
}: Props) {
  const monthLabel = formatMonthLabel(monthRef)
  const title = trainerView
    ? `${trainerName ?? '내'} 수업·수업료`
    : '강사별 수업·수업료'

  const primaryRow = summary?.byTrainer[0]

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/15 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-charcoal">{title}</h3>
          <p className="mt-1 text-xs text-muted">
            {trainerView
              ? `${monthLabel} 담당 PT 출석·그룹수업 진행 기준 · 비율 또는 고정금액 적용`
              : `${monthLabel} PT 출석·그룹수업 진행 기준 · 강사별 비율(%) 또는 고정금액(원/회)을 적용합니다.`}
            {!trainerView && summary
              ? ` (기본 ${summary.defaultSettlementRate}%, 개별 설정 우선)`
              : ''}
          </p>
        </div>
        {!trainerView && (
          <Link to="/admin/trainers" className={`${btnOutline} text-xs`}>
            강사 수업료 설정
          </Link>
        )}
      </div>

      {loading ? (
        <p className="px-5 py-6 text-sm text-muted">집계 중…</p>
      ) : !summary || summary.byTrainer.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          {monthLabel} {trainerView ? '담당 ' : ''}출석·수업 기록이 없습니다.
        </p>
      ) : (
        <>
          <div
            className={`grid gap-3 border-b border-gold/15 px-5 py-4 ${
              trainerView
                ? 'sm:grid-cols-2 lg:grid-cols-3'
                : 'sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            <div>
              <p className="text-xs text-muted">총 수업</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-charcoal">
                {summary.totalSessions}회
              </p>
            </div>
            {!trainerView && (
              <div>
                <p className="text-xs text-muted">소진 매출</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-charcoal">
                  {formatCurrency(summary.totalGross)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted">
                {trainerView ? '예상 수업료' : '강사 수업료 합계'}
                {trainerView && primaryRow
                  ? ` (${primaryRow.settlementLabel})`
                  : ''}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                {formatCurrency(summary.totalTrainerPay)}
              </p>
            </div>
            {!trainerView && (
              <div>
                <p className="text-xs text-muted">센터 몫</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-sky-700">
                  {formatCurrency(summary.totalCenterShare)}
                </p>
              </div>
            )}
          </div>

          {!trainerView && (
            <div className="table-scroll">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2.5">강사</th>
                    <th className="px-4 py-2.5">수업료</th>
                    <th className="px-4 py-2.5">수업 횟수</th>
                    <th className="px-4 py-2.5">소진 매출</th>
                    <th className="px-4 py-2.5">강사 수업료</th>
                    <th className="px-4 py-2.5">센터 몫</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/15">
                  {summary.byTrainer.map((row) => (
                    <tr
                      key={row.trainerId ?? row.trainerName}
                      className="hover:bg-cream/40"
                    >
                      <td className="px-4 py-3 font-medium text-charcoal">
                        {row.trainerName}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-charcoal/70">
                        {row.settlementLabel}
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
          )}
        </>
      )}
    </section>
  )
}
