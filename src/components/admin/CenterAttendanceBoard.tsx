import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  attendanceMethodLabel,
  cancelAttendance,
  centerAttendanceStatusLabel,
  checkInMember,
  fetchCenterAttendanceBoard,
  formatMonthLabel,
  type CenterAttendanceDisplayStatus,
  type CenterAttendanceRow,
  type MonthRef,
} from '../../api/attendance'
import { fetchMembers, formatPhone, isExpired } from '../../api/members'
import { updateScheduleStatus } from '../../api/schedule'
import { isSameLocalDay } from '../../utils/date'
import { formatSupabaseError, getErrorMessage } from '../../lib/errors'
import { SearchBar } from '../SearchBar'
import type { Member } from '../../types/database'
import { btnGold, btnOutline, cardClass } from '../../styles/theme'

type StatusFilter = 'all' | 'attended' | 'scheduled' | 'absent' | 'no_show'

const FILTER_OPTIONS: Array<{ id: StatusFilter; label: string; hint: string }> =
  [
    { id: 'all', label: '전체', hint: '오늘' },
    { id: 'attended', label: '출석', hint: '오늘' },
    { id: 'scheduled', label: '예정', hint: '월별' },
    { id: 'absent', label: '미출석', hint: '오늘' },
    { id: 'no_show', label: '노쇼', hint: '오늘' },
  ]

function currentMonthRef(): MonthRef {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const d = new Date(ref.year, ref.month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatScheduleDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadgeClass(status: CenterAttendanceDisplayStatus): string {
  switch (status) {
    case 'attended':
    case 'walk_in':
      return 'bg-emerald-100 text-emerald-800'
    case 'no_show':
      return 'bg-red-100 text-red-800'
    case 'absent':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gold/25 text-charcoal'
  }
}

function matchesTodayFilter(
  row: CenterAttendanceRow,
  filter: StatusFilter,
): boolean {
  switch (filter) {
    case 'attended':
      return (
        row.displayStatus === 'attended' || row.displayStatus === 'walk_in'
      )
    case 'absent':
      return row.displayStatus === 'absent'
    case 'no_show':
      return row.displayStatus === 'no_show'
    default:
      return true
  }
}

export function CenterAttendanceBoard() {
  const [todayRows, setTodayRows] = useState<CenterAttendanceRow[]>([])
  const [monthScheduledRows, setMonthScheduledRows] = useState<
    CenterAttendanceRow[]
  >([])
  const [summary, setSummary] = useState({
    attendedToday: 0,
    monthScheduled: 0,
    absentToday: 0,
    noShowToday: 0,
    monthAttendanceTotal: 0,
  })
  const [monthRef, setMonthRef] = useState<MonthRef>(currentMonthRef)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [actingKey, setActingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')

  const monthLabel = formatMonthLabel(monthRef)
  const isMonthView = statusFilter === 'scheduled'

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [board, memberList] = await Promise.all([
        fetchCenterAttendanceBoard(monthRef),
        fetchMembers(),
      ])
      setTodayRows(board.todayRows)
      setMonthScheduledRows(board.monthScheduledRows)
      setSummary(board.summary)
      setMembers(memberList)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [monthRef])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const sourceRows = isMonthView ? monthScheduledRows : todayRows

  const filteredRows = useMemo(() => {
    let list = sourceRows
    if (!isMonthView && statusFilter !== 'all') {
      list = list.filter((row) => matchesTodayFilter(row, statusFilter))
    }
    const term = activeSearch.trim().toLowerCase()
    if (!term) return list
    return list.filter((row) => {
      const member = memberById.get(row.memberId)
      const phone = member?.phone ?? ''
      return (
        row.memberName.toLowerCase().includes(term) ||
        (row.trainerName ?? '').toLowerCase().includes(term) ||
        phone.includes(term)
      )
    })
  }, [sourceRows, statusFilter, isMonthView, activeSearch, memberById])

  async function handleCheckIn(row: CenterAttendanceRow) {
    const member = memberById.get(row.memberId)
    if (!member) return
    if (
      !window.confirm(
        `${member.name} 님 출석 처리할까요?\nPT 1회가 차감됩니다. (잔여 ${member.remaining_sessions}회)`,
      )
    ) {
      return
    }

    setActingKey(row.key)
    setError(null)
    try {
      const { member: updated } = await checkInMember(row.memberId, 'admin')
      setToast(
        `${updated.name} 님 출석 완료 · 잔여 ${updated.remaining_sessions}회`,
      )
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActingKey(null)
    }
  }

  async function handleNoShow(row: CenterAttendanceRow) {
    if (!row.scheduleId) return
    if (!window.confirm(`${row.memberName} 님을 노쇼로 처리할까요?`)) return

    setActingKey(row.key)
    setError(null)
    try {
      await updateScheduleStatus(row.scheduleId, 'no_show')
      setToast(`${row.memberName} 님 노쇼 처리 완료`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '노쇼 처리에 실패했습니다.')
    } finally {
      setActingKey(null)
    }
  }

  async function handleCancel(row: CenterAttendanceRow) {
    if (!row.attendanceId) return
    if (
      !window.confirm(
        `${row.memberName} 님 오늘 출석을 취소할까요?\nPT 1회가 복구됩니다.`,
      )
    ) {
      return
    }

    setActingKey(row.key)
    setError(null)
    try {
      const updated = await cancelAttendance(row.attendanceId)
      setToast(
        `${row.memberName} 님 출석 취소 · 잔여 ${updated.remaining_sessions}회`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '출석 취소에 실패했습니다.')
    } finally {
      setActingKey(null)
    }
  }

  function canCheckIn(member: Member | undefined, row: CenterAttendanceRow): boolean {
    if (!member) return false
    if (row.displayStatus === 'attended' || row.displayStatus === 'walk_in') {
      return false
    }
    if (!row.scheduledAt || !isSameLocalDay(row.scheduledAt)) return false
    if (member.status !== 'active') return false
    if (member.remaining_sessions <= 0) return false
    if (member.expires_at && isExpired(member.expires_at)) return false
    return true
  }

  const tableTitle = isMonthView
    ? `${monthLabel} 예정 수업`
    : '오늘 현황'

  const tableDesc = isMonthView
    ? '해당 월에 예약되었으나 아직 출석 처리되지 않은 수업입니다.'
    : new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">출석부</h2>
        <p className="page-desc">
          오늘 출석·미출석·노쇼를 확인하고, 월별 예정 수업과 총 출석 횟수를
          조회합니다.
        </p>
      </div>

      {toast && (
        <div className="rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm font-medium text-charcoal">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthRef((m) => shiftMonth(m, -1))}
            className={btnOutline}
          >
            이전 달
          </button>
          <span className="min-w-[7rem] text-center text-sm font-semibold text-charcoal">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => setMonthRef((m) => shiftMonth(m, 1))}
            className={btnOutline}
          >
            다음 달
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMonthRef(currentMonthRef())}
          className="text-xs text-gold-dark hover:underline"
        >
          이번 달
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: '출석',
            sub: '오늘',
            value: summary.attendedToday,
            tone: 'text-emerald-700',
            filter: 'attended' as const,
          },
          {
            label: '예정',
            sub: monthLabel,
            value: summary.monthScheduled,
            tone: 'text-charcoal',
            filter: 'scheduled' as const,
          },
          {
            label: '미출석',
            sub: '오늘',
            value: summary.absentToday,
            tone: 'text-orange-700',
            filter: 'absent' as const,
          },
          {
            label: '노쇼',
            sub: '오늘',
            value: summary.noShowToday,
            tone: 'text-red-700',
            filter: 'no_show' as const,
          },
          {
            label: '총 출석',
            sub: monthLabel,
            value: summary.monthAttendanceTotal,
            tone: 'text-sky-700',
            filter: null,
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => item.filter && setStatusFilter(item.filter)}
            className={`${cardClass} card-pad text-left transition ${
              item.filter && statusFilter === item.filter
                ? 'ring-2 ring-gold/50'
                : 'hover:bg-cream/50'
            } ${item.filter ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <p className="text-xs text-muted">
              {item.label}
              <span className="ml-1 text-[10px]">({item.sub})</span>
            </p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${item.tone}`}>
              {item.value}
            </p>
          </button>
        ))}
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="card-header">
          <h3 className="text-base font-semibold text-charcoal">{tableTitle}</h3>
          <p className="mt-0.5 text-xs text-muted">{tableDesc}</p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gold/15 px-5 py-3">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setStatusFilter(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                statusFilter === option.id
                  ? 'bg-gold text-charcoal'
                  : 'bg-cream text-muted hover:text-charcoal'
              }`}
            >
              {option.label}
              <span className="ml-1 font-normal opacity-70">({option.hint})</span>
            </button>
          ))}
        </div>

        <div className="border-b border-gold/15 px-5 py-3 sm:px-6">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSearch={() => setActiveSearch(searchInput.trim())}
          />
        </div>

        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-muted">불러오는 중…</p>
        ) : filteredRows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted">
            표시할 항목이 없습니다.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5">회원</th>
                  <th className="px-4 py-2.5">트레이너</th>
                  <th className="px-4 py-2.5">예약</th>
                  <th className="px-4 py-2.5">상태</th>
                  <th className="px-4 py-2.5">출석 시각</th>
                  <th className="px-4 py-2.5">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {filteredRows.map((row) => {
                  const member = memberById.get(row.memberId)
                  const canCheck = canCheckIn(member, row)
                  const isActing = actingKey === row.key
                  const isTodaySchedule =
                    row.scheduledAt && isSameLocalDay(row.scheduledAt)

                  return (
                    <tr key={row.key} className="hover:bg-cream/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-charcoal">{row.memberName}</p>
                        {member && (
                          <p className="text-xs text-muted tabular-nums">
                            {formatPhone(member.phone)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-charcoal/70">
                        {row.trainerName ?? '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {row.scheduledAt
                          ? isMonthView
                            ? formatScheduleDateTime(row.scheduledAt)
                            : formatTime(row.scheduledAt)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(row.displayStatus)}`}
                        >
                          {centerAttendanceStatusLabel(row.displayStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-charcoal/70">
                        {row.checkedInAt ? (
                          <>
                            {formatTime(row.checkedInAt)}
                            {row.method && (
                              <span className="ml-1 text-muted">
                                ({attendanceMethodLabel(row.method)})
                              </span>
                            )}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          {canCheck && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => void handleCheckIn(row)}
                              className={`${btnGold} px-3 py-1.5 text-xs`}
                            >
                              출석
                            </button>
                          )}
                          {row.scheduleId &&
                            isTodaySchedule &&
                            (row.displayStatus === 'scheduled' ||
                              row.displayStatus === 'absent') && (
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => void handleNoShow(row)}
                                className={`${btnOutline} px-3 py-1.5 text-xs text-red-700`}
                              >
                                노쇼
                              </button>
                            )}
                          {row.attendanceId && isTodaySchedule && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => void handleCancel(row)}
                              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-40"
                            >
                              출석 취소
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
