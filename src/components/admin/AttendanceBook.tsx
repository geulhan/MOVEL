import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  attendanceMethodLabel,
  cancelAttendance,
  checkInMember,
  fetchAttendanceRecords,
  fetchTodayCheckedInMemberIds,
  type AttendanceRecord,
} from '../../api/attendance'
import { fetchMembers, formatPhone, isExpired } from '../../api/members'
import { fetchTodayScheduledMemberIdsForTrainer } from '../../api/schedule'
import { formatSupabaseError, getErrorMessage } from '../../lib/errors'
import { SearchBar } from '../SearchBar'
import type { Member } from '../../types/database'
import { btnGold, btnOutline, cardClass } from '../../styles/theme'
import { filterBySearch } from '../../utils/renewal'

export type AttendanceRole = 'admin' | 'trainer'

type Props = {
  role: AttendanceRole
  trainerId?: string
  trainerName?: string
  title?: string
  description?: string
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AttendanceBook({
  role,
  trainerId,
  trainerName,
  title = '출석부',
  description,
}: Props) {
  const canModify = role === 'admin'
  const checkInMethod = role === 'admin' ? 'admin' : 'trainer'

  const defaultDesc =
    role === 'admin'
      ? '출석 처리 시 PT 1회 차감 · 관리자만 출석 취소(PT 복구) 가능'
      : `${trainerName ?? '트레이너'} 담당 회원 출석 처리 (PT 1회 차감 · 수정 불가)`

  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [checkedInToday, setCheckedInToday] = useState<Set<string>>(new Set())
  const [scheduledTodayIds, setScheduledTodayIds] = useState<Set<string>>(
    new Set(),
  )
  const [fromDate, setFromDate] = useState(todayStr())
  const [toDate, setToDate] = useState(todayStr())
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkingInId, setCheckingInId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, memberList, todayIds, todayScheduleIds] = await Promise.all([
        fetchAttendanceRecords(fromDate, toDate),
        fetchMembers(),
        fetchTodayCheckedInMemberIds(),
        role === 'trainer' && trainerId
          ? fetchTodayScheduledMemberIdsForTrainer(trainerId)
          : Promise.resolve(new Set<string>()),
      ])
      setRecords(data)
      setMembers(memberList)
      setCheckedInToday(todayIds)
      setScheduledTodayIds(todayScheduleIds)
    } catch (err) {
      setRecords([])
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, role, trainerId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const displayMembers = useMemo(() => {
    let list = members.filter((m) => m.status !== 'terminated')
    if (role === 'trainer' && trainerId) {
      list = list.filter(
        (m) => m.trainer_id === trainerId || scheduledTodayIds.has(m.id),
      )
    }
    return filterBySearch(list, activeSearch)
  }, [members, activeSearch, role, trainerId, scheduledTodayIds])

  const displayRecords = useMemo(() => {
    if (role !== 'trainer' || !trainerId) return records
    const memberIds = new Set(
      members.filter((m) => m.trainer_id === trainerId).map((m) => m.id),
    )
    return records.filter((r) => memberIds.has(r.member_id))
  }, [records, members, role, trainerId])

  async function handleCheckIn(member: Member) {
    if (checkedInToday.has(member.id)) return

    if (
      !window.confirm(
        `${member.name} 님 출석 처리할까요?\nPT 1회가 차감됩니다. (잔여 ${member.remaining_sessions}회)`,
      )
    ) {
      return
    }

    setCheckingInId(member.id)
    setError(null)
    try {
      const { member: updated } = await checkInMember(member.id, checkInMethod)
      setMembers((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      )
      setCheckedInToday((prev) => new Set(prev).add(member.id))
      setToast(
        `${updated.name} 님 출석 완료 · 잔여 ${updated.remaining_sessions}회`,
      )
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCheckingInId(null)
    }
  }

  async function handleCancel(record: AttendanceRecord) {
    if (
      !window.confirm(
        `${record.member_name} 님 ${formatDateTime(record.checked_in_at)} 출석을 취소할까요?\nPT 1회가 복구됩니다.`,
      )
    ) {
      return
    }

    setCancellingId(record.id)
    setError(null)
    try {
      const updated = await cancelAttendance(record.id)
      setToast(
        `${record.member_name} 님 출석 취소 · 잔여 ${updated.remaining_sessions}회`,
      )
      await load()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '출석 취소에 실패했습니다.',
      )
    } finally {
      setCancellingId(null)
    }
  }

  function canCheckIn(member: Member): boolean {
    if (checkedInToday.has(member.id)) return false
    if (member.status !== 'active') return false
    if (member.remaining_sessions <= 0) return false
    if (member.expires_at && isExpired(member.expires_at)) return false
    return true
  }

  function checkInDisabledReason(member: Member): string | undefined {
    if (checkedInToday.has(member.id)) return '오늘 출석 완료'
    if (member.status !== 'active') return '활성 회원만 가능'
    if (member.remaining_sessions <= 0) return '잔여 PT 없음'
    if (member.expires_at && isExpired(member.expires_at)) return '만료된 회원'
    return undefined
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">{title}</h2>
        <p className="page-desc">{description ?? defaultDesc}</p>
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

      <section className={`${cardClass} overflow-hidden`}>
        <div className="card-header">
          <h3 className="text-base font-semibold text-charcoal">오늘 출석</h3>
          <p className="mt-0.5 text-xs text-muted">
            {role === 'trainer'
              ? '담당 회원만 표시됩니다'
              : '전체 회원 · 출석 시 PT 1회 차감'}
          </p>
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
        ) : displayMembers.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted">
            {role === 'trainer'
              ? '담당 회원이 없습니다.'
              : '표시할 회원이 없습니다.'}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5">회원</th>
                  <th className="px-4 py-2.5">전화번호</th>
                  <th className="px-4 py-2.5">잔여 PT</th>
                  <th className="px-4 py-2.5">오늘</th>
                  <th className="px-4 py-2.5">출석</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {displayMembers.map((member) => {
                  const done = checkedInToday.has(member.id)
                  const can = canCheckIn(member)
                  const reason = checkInDisabledReason(member)

                  return (
                    <tr key={member.id} className="hover:bg-cream/40">
                      <td className="max-w-[8rem] truncate px-4 py-3 font-medium text-charcoal">
                        {member.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-charcoal/70 tabular-nums">
                        {formatPhone(member.phone)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {member.remaining_sessions}회
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {done ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            출석완료
                          </span>
                        ) : (
                          <span className="text-xs text-charcoal/45">미출석</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void handleCheckIn(member)}
                          disabled={!can || checkingInId === member.id}
                          title={reason}
                          className={can ? btnGold : btnOutline}
                        >
                          {checkingInId === member.id
                            ? '처리 중…'
                            : done
                              ? '완료'
                              : '출석하기'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={`${cardClass} card-pad flex flex-wrap items-end gap-4`}>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal/70">시작일</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal/70">종료일</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input-field"
          />
        </label>
        <button type="button" onClick={() => void load()} className="btn-primary">
          조회
        </button>
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="card-header">
          <h3 className="text-base font-semibold text-charcoal">출석 기록</h3>
          {canModify && (
            <p className="mt-0.5 text-xs text-muted">
              관리자만 출석 취소 가능 (PT 1회 복구)
            </p>
          )}
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-charcoal/50">
            불러오는 중…
          </p>
        ) : displayRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-charcoal/50">
            해당 기간 출석 기록이 없습니다.
          </p>
        ) : (
          <div className="table-scroll">
            <table
              className={`w-full text-left text-sm ${canModify ? 'min-w-[520px]' : 'min-w-[400px]'}`}
            >
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2">일시</th>
                  <th className="px-4 py-2">회원</th>
                  <th className="px-4 py-2">방식</th>
                  {canModify && <th className="px-4 py-2">관리</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {displayRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-charcoal tabular-nums">
                      {formatDateTime(r.checked_in_at)}
                    </td>
                    <td className="max-w-[8rem] truncate px-4 py-3 font-medium text-charcoal">
                      {r.member_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-charcoal/70">
                      {attendanceMethodLabel(r.method)}
                    </td>
                    {canModify && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void handleCancel(r)}
                          disabled={cancellingId === r.id}
                          className="btn-ghost text-red-600"
                        >
                          {cancellingId === r.id ? '…' : '출석 취소'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && displayRecords.length > 0 && (
          <p className="border-t border-gold/15 px-5 py-3 text-xs text-charcoal/50">
            총 {displayRecords.length}건 (최대 200건)
          </p>
        )}
      </div>
    </div>
  )
}
