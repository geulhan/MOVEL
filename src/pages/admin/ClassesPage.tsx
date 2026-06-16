import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CLASS_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  cancelClassReservation,
  createClass,
  createClassSchedule,
  fetchClassSchedulesInRange,
  fetchClasses,
  fetchScheduleReservations,
  reserveClassForMember,
  updateReservationStatus,
  type ClassReservation,
  type ClassSchedule,
  type ClassType,
  type FitnessClass,
  type ReservationStatus,
} from '../../api/classes'
import { fetchMembers } from '../../api/members'
import { getAdminSession } from '../../lib/adminSession'
import { todayDateString } from '../../api/members'
import { PageHeader } from '../../components/admin/PageHeader'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import type { Member } from '../../types/database'

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}

export default function ClassesPage() {
  const session = getAdminSession()
  const [view, setView] = useState<'week' | 'list'>('week')
  const [weekStart, setWeekStart] = useState(todayDateString())
  const [classes, setClasses] = useState<FitnessClass[]>([])
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null)
  const [reservations, setReservations] = useState<ClassReservation[]>([])
  const [showNewClass, setShowNewClass] = useState(false)
  const [showNewSchedule, setShowNewSchedule] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassType, setNewClassType] = useState<ClassType>('pilates')
  const [newScheduleClassId, setNewScheduleClassId] = useState('')
  const [newScheduleDate, setNewScheduleDate] = useState(todayDateString())
  const [newScheduleTime, setNewScheduleTime] = useState('10:00')
  const [reserveMemberId, setReserveMemberId] = useState('')

  const rangeEnd = addDays(weekStart, view === 'week' ? 6 : 30)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cls, sched, mem] = await Promise.all([
        fetchClasses(),
        fetchClassSchedulesInRange(`${weekStart}T00:00:00`, `${rangeEnd}T23:59:59`),
        fetchMembers(),
      ])
      setClasses(cls.filter((c) => c.status === 'active'))
      setSchedules(sched)
      setMembers(mem)
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [weekStart, rangeEnd])

  useEffect(() => {
    void load()
  }, [load])

  async function openSchedule(schedule: ClassSchedule) {
    setSelectedSchedule(schedule)
    try {
      const rows = await fetchScheduleReservations(schedule.id)
      setReservations(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : '예약 목록 실패')
    }
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) return
    await createClass({ name: newClassName.trim(), class_type: newClassType })
    setShowNewClass(false)
    setNewClassName('')
    await load()
  }

  async function handleCreateSchedule() {
    if (!newScheduleClassId) return
    const cls = classes.find((c) => c.id === newScheduleClassId)
    const duration = cls?.duration_minutes ?? 60
    const starts = new Date(`${newScheduleDate}T${newScheduleTime}:00`)
    const ends = new Date(starts.getTime() + duration * 60 * 1000)
    await createClassSchedule({
      class_id: newScheduleClassId,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    })
    setShowNewSchedule(false)
    await load()
  }

  async function handleReserve() {
    if (!selectedSchedule || !reserveMemberId) return
    await reserveClassForMember({
      scheduleId: selectedSchedule.id,
      memberId: reserveMemberId,
    })
    setReserveMemberId('')
    await openSchedule(selectedSchedule)
    await load()
  }

  async function handleStatusChange(reservation: ClassReservation, status: ReservationStatus) {
    if (!selectedSchedule) return
    const cls = classes.find((c) => c.id === selectedSchedule.class_id)
    if (!cls) return

    if (status === 'cancelled') {
      await cancelClassReservation({ reservationId: reservation.id })
    } else {
      await updateReservationStatus({
        reservationId: reservation.id,
        status,
        scheduleId: selectedSchedule.id,
        classId: cls.id,
        memberId: reservation.member_id,
        checkedBy: session?.username,
      })
    }
    await openSchedule(selectedSchedule)
    await load()
  }

  const schedulesByDay = useMemo(() => {
    const map = new Map<string, ClassSchedule[]>()
    for (const s of schedules) {
      const day = s.starts_at.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(s)
    }
    return map
  }, [schedules])

  const days = useMemo(() => {
    const list: string[] = []
    const count = view === 'week' ? 7 : 31
    for (let i = 0; i < count; i += 1) {
      list.push(addDays(weekStart, i))
    }
    return list
  }, [weekStart, view])

  return (
    <div className="space-y-6">
      <PageHeader
        title="클래스"
        description="필라테스·요가·GX·소그룹 PT 시간표와 예약을 관리합니다. 회원은 수업 24시간 전까지 취소할 수 있습니다."
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={view === 'week' ? btnPrimary : btnOutline}
          onClick={() => setView('week')}
        >
          주간
        </button>
        <button
          type="button"
          className={view === 'list' ? btnPrimary : btnOutline}
          onClick={() => setView('list')}
        >
          월간
        </button>
        <input
          type="date"
          className={inputClass}
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
        />
        <button type="button" className={btnOutline} onClick={() => setShowNewClass(true)}>
          + 클래스 등록
        </button>
        <button type="button" className={btnPrimary} onClick={() => setShowNewSchedule(true)}>
          + 일정 추가
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-muted">불러오는 중…</p>}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => (
          <section key={day} className={`${cardClass} card-pad`}>
            <h3 className="font-semibold text-charcoal">{formatDateLabel(`${day}T12:00:00`)}</h3>
            <ul className="mt-3 space-y-2">
              {(schedulesByDay.get(day) ?? []).length === 0 ? (
                <li className="text-sm text-muted">일정 없음</li>
              ) : (
                (schedulesByDay.get(day) ?? []).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-gold/20 bg-white px-3 py-2 text-left text-sm hover:border-gold/50"
                      onClick={() => void openSchedule(s)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{s.class_name}</span>
                        <span className="text-xs text-muted">
                          {formatTime(s.starts_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {CLASS_TYPE_LABELS[s.class_type ?? 'pilates']} · 예약{' '}
                        {s.reserved_count ?? 0}/{s.capacity ?? 8}
                        {(s.waitlist_count ?? 0) > 0 && ` · 대기 ${s.waitlist_count}`}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
      </div>

      {selectedSchedule && (
        <section className={`${cardClass} card-pad space-y-4`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{selectedSchedule.class_name}</h2>
              <p className="text-sm text-muted">
                {formatDateLabel(selectedSchedule.starts_at)}{' '}
                {formatTime(selectedSchedule.starts_at)} · 예약{' '}
                {selectedSchedule.reserved_count ?? 0}/
                {selectedSchedule.capacity ?? 8}
              </p>
            </div>
            <button type="button" className={btnOutline} onClick={() => setSelectedSchedule(null)}>
              닫기
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className={inputClass}
              value={reserveMemberId}
              onChange={(e) => setReserveMemberId(e.target.value)}
            >
              <option value="">회원 선택</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={btnPrimary}
              disabled={!reserveMemberId}
              onClick={() => void handleReserve()}
            >
              예약 추가
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="py-2">회원</th>
                <th className="py-2">상태</th>
                <th className="py-2">처리</th>
              </tr>
            </thead>
            <tbody>
              {reservations
                .filter((r) => r.status !== 'cancelled')
                .map((r) => (
                  <tr key={r.id} className="border-b border-gold/10">
                    <td className="py-2">{r.member_name ?? r.member_id}</td>
                    <td className="py-2">{RESERVATION_STATUS_LABELS[r.status]}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {(['attended', 'noshow', 'cancelled'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className="rounded border border-gold/30 px-2 py-0.5 text-xs"
                            onClick={() => void handleStatusChange(r, status)}
                          >
                            {RESERVATION_STATUS_LABELS[status]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {showNewClass && (
        <section className={`${cardClass} card-pad space-y-3`}>
          <h3 className="font-semibold">클래스 등록</h3>
          <input
            className={inputClass}
            placeholder="클래스 이름"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
          />
          <select
            className={inputClass}
            value={newClassType}
            onChange={(e) => setNewClassType(e.target.value as ClassType)}
          >
            {Object.entries(CLASS_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} onClick={() => void handleCreateClass()}>
              등록
            </button>
            <button type="button" className={btnOutline} onClick={() => setShowNewClass(false)}>
              취소
            </button>
          </div>
        </section>
      )}

      {showNewSchedule && (
        <section className={`${cardClass} card-pad space-y-3`}>
          <h3 className="font-semibold">일정 추가</h3>
          <select
            className={inputClass}
            value={newScheduleClassId}
            onChange={(e) => setNewScheduleClassId(e.target.value)}
          >
            <option value="">클래스 선택</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className={inputClass}
            value={newScheduleDate}
            onChange={(e) => setNewScheduleDate(e.target.value)}
          />
          <input
            type="time"
            className={inputClass}
            value={newScheduleTime}
            onChange={(e) => setNewScheduleTime(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} onClick={() => void handleCreateSchedule()}>
              추가
            </button>
            <button type="button" className={btnOutline} onClick={() => setShowNewSchedule(false)}>
              취소
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
