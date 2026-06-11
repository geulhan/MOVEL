import { attendanceMethodLabel } from '../../api/attendance'
import { cardClass } from '../../styles/theme'
import { useMemberDetail } from './MemberDetailContext'
import { formatDateTime } from './ui'

export function MemberAttendanceTab() {
  const { attendance } = useMemberDetail()

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="card-header">
        <h3 className="text-base font-semibold text-charcoal">출석 내역</h3>
        <p className="mt-0.5 text-xs text-muted">출석 시 PT 1회 차감</p>
      </div>
      {attendance.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">
          출석 기록이 없습니다.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2.5">출석일</th>
                <th className="px-4 py-2.5">담당 트레이너</th>
                <th className="px-4 py-2.5">차감</th>
                <th className="px-4 py-2.5">방식</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/15">
              {attendance.map((a) => (
                <tr key={a.id} className="hover:bg-cream/40">
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {formatDateTime(a.checked_in_at)}
                  </td>
                  <td className="max-w-[8rem] truncate px-4 py-3">
                    {a.trainer_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {a.deducted ? (
                      <span className="text-xs font-semibold text-charcoal">
                        1회 차감
                      </span>
                    ) : (
                      <span className="text-xs text-charcoal/40">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-charcoal/60">
                    {attendanceMethodLabel(a.method)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
