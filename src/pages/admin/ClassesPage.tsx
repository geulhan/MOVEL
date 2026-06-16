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
import { fetchMembers, todayDateString } from '../../api/members'
import { getAdminSession } from '../../lib/adminSession'
import { getErrorMessage } from '../../lib/errors'
import { filterBySearch } from '../../utils/renewal'
import {
  addDays,
  formatDayHeading,
  formatTime,
  startOfWeekMonday,
  weekDaysFrom,
} from '../../utils/weekRange'
import { PageHeader } from '../../components/admin/PageHeader'
import { AdminToast, useAdminToast } from '../../components/admin/AdminToast'
import { MemberSearchCombobox } from '../../components/admin/MemberSearchCombobox'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import type { Member } from '../../types/database'

type ModalKind = 'class' | 'schedule' | null

export default function ClassesPage() {
  const session = getAdminSession()
  const { toast, setToast, clearToast } = useAdminToast()
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(todayDateString()))
  const [classes, setClasses] = useState<FitnessClass[]>([])
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null)
  const [reservations, setReservations] = useState<ClassReservation[]>([])
  const [modal, setModal] = useState<ModalKind>(null)
  const [newClassName, setNewClassName] = useState('')
  const [newClassType, setNewClassType] = useState<ClassType>('pilates')
  const [newScheduleClassId, setNewScheduleClassId] = useState('')
  const [newScheduleDate, setNewScheduleDate] = useState(todayDateString())
  const [newScheduleTime, setNewScheduleTime] = useState('10:00')
  const [reserveQuery, setReserveQuery] = useState('')
  const [reserveMember, setReserveMember] = useState<Member | null>(null)

  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${formatDayHeading(weekStart)} ~ ${formatDayHeading(weekEnd)}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cls, sched, mem] = await Promise.all([
        fetchClasses(),
        fetchClassSchedulesInRange(`${weekStart}T00:00:00`, `${weekEnd}T23:59:59`),
        fetchMembers(),
      ])
      setClasses(cls.filter((c) => c.status === 'active'))
      setSchedules(sched)
      setMembers(mem)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd])

  useEffect(() => {
    void load()
  }, [load])

  const schedulesByDay = useMemo(() => {
    const map = new Map<string, ClassSchedule[]>()
    for (const day of weekDaysFrom(weekStart)) {
      map.set(day, [])
    }
    for (const s of schedules) {
      const day = s.starts_at.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(s)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    }
    return map
  }, [schedules, weekStart])

  const reserveSuggestions = useMemo(
    () => filterBySearch(members, reserveQuery),
    [members, reserveQuery],
  )

  async function openSchedule(schedule: ClassSchedule) {
    setSelectedSchedule(schedule)
    setReserveQuery('')
    setReserveMember(null)
    try {
      const rows = await fetchScheduleReservations(schedule.id)
      setReservations(rows)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function runAction(task: () => Promise<void>, successMessage: string) {
    setActionLoading(true)
    setError(null)
    try {
      await task()
      setToast(successMessage)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) {
      setError('클래스 이름을 입력해 주세요.')
      return
    }
    await runAction(async () => {
      await createClass({ name: newClassName.trim(), class_type: newClassType })
      setModal(null)
      setNewClassName('')
      await load()
    }, '클래스가 등록되었습니다.')
  }

  async function handleCreateSchedule() {
    if (!newScheduleClassId) {
      setError('클래스를 선택해 주세요.')
      return
    }
    const cls = classes.find((c) => c.id === newScheduleClassId)
    const duration = cls?.duration_minutes ?? 60
    const starts = new Date(`${newScheduleDate}T${newScheduleTime}:00`)
    const ends = new Date(starts.getTime() + duration * 60 * 1000)
    await runAction(async () => {
      await createClassSchedule({
        class_id: newScheduleClassId,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
      })
      setModal(null)
      await load()
    }, '일정이 추가되었습니다.')
  }

  async function handleReserve() {
    if (!selectedSchedule || !reserveMember) return
    await runAction(async () => {
      await reserveClassForMember({
        scheduleId: selectedSchedule.id,
        memberId: reserveMember.id,
      })
      setReserveMember(null)
      setReserveQuery('')
      await openSchedule(selectedSchedule)
      await load()
    }, `${reserveMember.name} 님 예약 완료`)
  }

  async function handleStatusChange(reservation: ClassReservation, status: ReservationStatus) {
    if (!selectedSchedule) return
    const cls = classes.find((c) => c.id === selectedSchedule.class_id)
    if (!cls) return

    await runAction(async () => {
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
    }, `${reservation.member_name ?? '회원'} · ${RESERVATION_STATUS_LABELS[status]}`)
  }

  const activeReservations = reservations.filter((r) => r.status !== 'cancelled')

  return (
    <div className="space-y-5">
      <PageHeader
        title="클래스"
        description="이번 주 시간표에서 수업을 선택하고, 출석·예약을 바로 처리하세요."
      />

      <AdminToast message={toast} onClear={clearToast} />

      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 whitespace-pre-line">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnOutline}
          disabled={loading}
          onClick={() => setWeekStart((prev) => addDays(prev, -7))}
        >
          ← 이전 주
        </button>
        <button
          type="button"
          className={btnOutline}
          disabled={loading}
          onClick={() => setWeekStart(startOfWeekMonday(todayDateString()))}
        >
          이번 주
        </button>
        <button
          type="button"
          className={btnOutline}
          disabled={loading}
          onClick={() => setWeekStart((prev) => addDays(prev, 7))}
        >
          다음 주 →
        </button>
        <span className="text-sm font-medium text-charcoal">{weekLabel}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className={btnOutline}
            disabled={actionLoading}
            onClick={() => setModal('class')}
          >
            + 클래스
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={actionLoading || classes.length === 0}
            onClick={() => {
              setNewScheduleDate(todayDateString())
              setModal('schedule')
            }}
          >
            + 일정
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className={`${cardClass} card-pad min-h-[20rem]`}>
          <h2 className="mb-3 text-sm font-semibold text-charcoal">이번 주 일정</h2>
          {loading ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : (
            <div className="space-y-4">
              {weekDaysFrom(weekStart).map((day) => {
                const daySchedules = schedulesByDay.get(day) ?? []
                const isToday = day === todayDateString()
                return (
                  <div key={day}>
                    <p
                      className={`mb-1.5 text-xs font-semibold ${
                        isToday ? 'text-charcoal' : 'text-muted'
                      }`}
                    >
                      {formatDayHeading(day)}
                      {isToday && <span className="ml-1 text-gold">오늘</span>}
                    </p>
                    {daySchedules.length === 0 ? (
                      <p className="py-1 text-xs text-muted/80">일정 없음</p>
                    ) : (
                      <ul className="space-y-1">
                        {daySchedules.map((s) => {
                          const selected = selectedSchedule?.id === s.id
                          const full = (s.reserved_count ?? 0) >= (s.capacity ?? 8)
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => void openSchedule(s)}
                                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                                  selected
                                    ? 'border-charcoal bg-charcoal text-cream'
                                    : 'border-gold/20 bg-white hover:border-gold/45'
                                }`}
                              >
                                <span className="w-12 shrink-0 font-mono text-xs">
                                  {formatTime(s.starts_at)}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-medium">
                                  {s.class_name}
                                </span>
                                <span
                                  className={`shrink-0 text-xs ${
                                    selected ? 'text-cream/80' : 'text-muted'
                                  }`}
                                >
                                  {s.reserved_count ?? 0}/{s.capacity ?? 8}
                                  {full ? ' · 마감' : ''}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className={`${cardClass} card-pad min-h-[20rem]`}>
          {!selectedSchedule ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-charcoal">수업을 선택하세요</p>
              <p className="mt-1 text-xs text-muted">
                왼쪽 목록에서 수업을 누르면 예약·출석을 처리할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-charcoal">
                  {selectedSchedule.class_name}
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  {formatDayHeading(selectedSchedule.starts_at.slice(0, 10))}{' '}
                  {formatTime(selectedSchedule.starts_at)} ·{' '}
                  {CLASS_TYPE_LABELS[selectedSchedule.class_type ?? 'pilates']} · 예약{' '}
                  {selectedSchedule.reserved_count ?? 0}/{selectedSchedule.capacity ?? 8}
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-gold/20 bg-cream/40 p-3">
                <p className="text-xs font-semibold text-charcoal">예약 추가</p>
                <MemberSearchCombobox
                  value={reserveQuery}
                  suggestions={reserveSuggestions}
                  onChange={setReserveQuery}
                  onSelect={(member) => {
                    setReserveMember(member)
                    setReserveQuery(member.name)
                  }}
                  onClear={() => setReserveMember(null)}
                />
                <button
                  type="button"
                  className={`${btnPrimary} w-full`}
                  disabled={!reserveMember || actionLoading}
                  onClick={() => void handleReserve()}
                >
                  {reserveMember ? `${reserveMember.name} 님 예약` : '회원 검색 후 예약'}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-charcoal">
                  예약 회원 ({activeReservations.length}명)
                </p>
                {activeReservations.length === 0 ? (
                  <p className="text-sm text-muted">예약된 회원이 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {activeReservations.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-xl border border-gold/20 bg-white px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-charcoal">
                              {r.member_name ?? '회원'}
                            </p>
                            <p className="text-xs text-muted">
                              {RESERVATION_STATUS_LABELS[r.status]}
                            </p>
                          </div>
                        </div>
                        {r.status === 'reserved' || r.status === 'waitlist' ? (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              className="rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white"
                              onClick={() => void handleStatusChange(r, 'attended')}
                            >
                              출석
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              className="rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white"
                              onClick={() => void handleStatusChange(r, 'noshow')}
                            >
                              노쇼
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              className="rounded-lg border border-gold/40 py-2.5 text-sm font-semibold text-charcoal"
                              onClick={() => void handleStatusChange(r, 'cancelled')}
                            >
                              취소
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/45 p-4 sm:items-center">
          <div className={`${cardClass} w-full max-w-md space-y-4 p-5 shadow-xl`}>
            {modal === 'class' ? (
              <>
                <h3 className="text-lg font-semibold">클래스 등록</h3>
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
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={actionLoading}
                    onClick={() => void handleCreateClass()}
                  >
                    등록
                  </button>
                  <button
                    type="button"
                    className={btnOutline}
                    onClick={() => setModal(null)}
                  >
                    닫기
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">일정 추가</h3>
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
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={actionLoading}
                    onClick={() => void handleCreateSchedule()}
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    className={btnOutline}
                    onClick={() => setModal(null)}
                  >
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
