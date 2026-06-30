import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CLASS_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  cancelClassReservation,
  createClass,
  createClassSchedule,
  cancelClassSchedule,
  deleteClass,
  fetchClassSchedulesInRange,
  fetchClasses,
  fetchScheduleReservations,
  reserveClassForMember,
  updateClass,
  updateReservationStatus,
  type ClassReservation,
  type ClassSchedule,
  type ClassType,
  type FitnessClass,
  type ReservationStatus,
} from '../../api/classes'
import { fetchMembers, formatPhone, todayDateString } from '../../api/members'
import {
  classRequiresSessionPass,
  fetchEligibleMemberIdsForClassPass,
} from '../../api/memberSessionPasses'
import {
  createClassFixedSchedule,
  deactivateClassFixedSchedule,
  fetchClassFixedSchedules,
  formatClassFixedScheduleTimes,
  getClassFixedDayTimes,
  getClassFixedDaysOfWeek,
  syncClassFixedScheduleAhead,
  updateClassFixedScheduleSeries,
  type ClassFixedSchedule,
} from '../../api/classFixedSchedule'
import { fetchTrainers } from '../../api/trainers'
import { getAdminSession } from '../../lib/adminSession'
import { getErrorMessage } from '../../lib/errors'
import { filterBySearch, resolveMemberFromSearch } from '../../utils/renewal'
import {
  addDays,
  formatDayHeading,
  formatTime,
  startOfWeekMonday,
  weekDaysFrom,
} from '../../utils/weekRange'
import { buildClassFixedScheduleDatesWithTimes } from '../../utils/fixedScheduleDates'
import type { DayTimeMap } from '../../utils/fixedScheduleDates'
import { WEEKDAYS } from '../../utils/calendar'
import {
  DEFAULT_CLASS_CONTENT_FIELDS,
  classContentPreview,
  normalizeClassContentFields,
  type ClassContentFields,
} from '../../constants/classContentFields'
import { FixedDayTimeFields } from '../../components/admin/FixedDayTimeFields'
import { PageHeader } from '../../components/admin/PageHeader'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import { AdminToast, useAdminToast } from '../../components/admin/AdminToast'
import { MemberSearchCombobox } from '../../components/admin/MemberSearchCombobox'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import type { Member } from '../../types/database'
import type { Trainer } from '../../types/database'

type ModalKind = 'class' | 'edit-class' | 'schedule' | 'edit-fixed' | null

function emptyContentFields(): ClassContentFields {
  return Object.fromEntries(
    DEFAULT_CLASS_CONTENT_FIELDS.map((field) => [field.key, '']),
  )
}

export default function ClassesPage() {
  const session = getAdminSession()
  const { toast, setToast, clearToast } = useAdminToast()
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(todayDateString()))
  const [classes, setClasses] = useState<FitnessClass[]>([])
  const [fixedSchedules, setFixedSchedules] = useState<ClassFixedSchedule[]>([])
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null)
  const [reservations, setReservations] = useState<ClassReservation[]>([])
  const [modal, setModal] = useState<ModalKind>(null)
  const [newClassName, setNewClassName] = useState('')
  const [newClassType, setNewClassType] = useState<ClassType>('pilates')
  const [newClassCapacity, setNewClassCapacity] = useState(8)
  const [newClassTrainerId, setNewClassTrainerId] = useState('')
  const [newClassDescription, setNewClassDescription] = useState('')
  const [newClassDuration, setNewClassDuration] = useState(60)
  const [newClassDeductSessions, setNewClassDeductSessions] = useState(true)
  const [newClassWaitlist, setNewClassWaitlist] = useState(false)
  const [newClassContentFields, setNewClassContentFields] =
    useState<ClassContentFields>(emptyContentFields)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [newScheduleClassId, setNewScheduleClassId] = useState('')
  const [newScheduleDate, setNewScheduleDate] = useState(todayDateString())
  const [newScheduleTime, setNewScheduleTime] = useState('10:00')
  const [newScheduleCapacity, setNewScheduleCapacity] = useState(8)
  const [newScheduleMode, setNewScheduleMode] = useState<'single' | 'fixed'>('single')
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1])
  const [newScheduleDayTimes, setNewScheduleDayTimes] = useState<DayTimeMap>({ 1: '10:00' })
  const [newScheduleWeeksAhead, setNewScheduleWeeksAhead] = useState(8)
  const [newScheduleNote, setNewScheduleNote] = useState('')
  const [editFixed, setEditFixed] = useState<ClassFixedSchedule | null>(null)
  const [editFixedDays, setEditFixedDays] = useState<number[]>([1])
  const [editFixedDayTimes, setEditFixedDayTimes] = useState<DayTimeMap>({ 1: '10:00' })
  const [editFixedWeeksAhead, setEditFixedWeeksAhead] = useState(8)
  const [editFixedCapacity, setEditFixedCapacity] = useState(8)
  const [editFixedNote, setEditFixedNote] = useState('')
  const [reserveQuery, setReserveQuery] = useState('')
  const [reserveMember, setReserveMember] = useState<Member | null>(null)
  const [eligibleMemberIds, setEligibleMemberIds] = useState<Set<string> | null>(null)

  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${formatDayHeading(weekStart)} ~ ${formatDayHeading(weekEnd)}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cls, sched, mem, trainerRows, fixedRows] = await Promise.all([
        fetchClasses(),
        fetchClassSchedulesInRange(`${weekStart}T00:00:00`, `${weekEnd}T23:59:59`),
        fetchMembers(),
        fetchTrainers(),
        fetchClassFixedSchedules({ activeOnly: true }),
      ])
      setClasses(cls.filter((c) => c.status === 'active'))
      setFixedSchedules(fixedRows)
      setSchedules(sched)
      setMembers(mem)
      setTrainers(trainerRows)
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

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'active'),
    [members],
  )

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedSchedule?.class_id),
    [classes, selectedSchedule],
  )

  const scheduleRequiresPass = Boolean(
    selectedClass &&
      classRequiresSessionPass(selectedClass.pass_type, selectedClass.deduct_sessions),
  )

  useEffect(() => {
    if (!selectedClass) {
      setEligibleMemberIds(null)
      return
    }
    let cancelled = false
    void fetchEligibleMemberIdsForClassPass(
      selectedClass.pass_type,
      selectedClass.deduct_sessions,
    )
      .then((ids) => {
        if (!cancelled) setEligibleMemberIds(ids)
      })
      .catch(() => {
        if (!cancelled) setEligibleMemberIds(new Set())
      })
    return () => {
      cancelled = true
    }
  }, [selectedClass])

  const reservedMemberIds = useMemo(
    () =>
      new Set(
        reservations.filter((r) => r.status !== 'cancelled').map((r) => r.member_id),
      ),
    [reservations],
  )

  const reserveSuggestions = useMemo(
    () => filterBySearch(activeMembers, reserveQuery),
    [activeMembers, reserveQuery],
  )

  const reservePickList = useMemo(() => {
    const pool = reserveQuery.trim() ? reserveSuggestions : activeMembers
    let list = pool.filter((m) => !reservedMemberIds.has(m.id))
    if (eligibleMemberIds) {
      list = list.filter((m) => eligibleMemberIds.has(m.id))
    }
    return list.slice(0, 12)
  }, [
    reserveQuery,
    reserveSuggestions,
    activeMembers,
    reservedMemberIds,
    eligibleMemberIds,
  ])

  const reserveTargetMember = useMemo(
    () => resolveMemberFromSearch(activeMembers, reserveQuery, reserveMember),
    [activeMembers, reserveQuery, reserveMember],
  )

  const reserveAmbiguous =
    reserveQuery.trim().length > 0 &&
    !reserveMember &&
    reserveSuggestions.length > 1 &&
    !reserveTargetMember

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

  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes],
  )

  function resetClassForm() {
    setNewClassName('')
    setNewClassType('pilates')
    setNewClassCapacity(8)
    setNewClassTrainerId('')
    setNewClassDescription('')
    setNewClassDuration(60)
    setNewClassDeductSessions(true)
    setNewClassWaitlist(false)
    setNewClassContentFields(emptyContentFields())
  }

  function openClassModal() {
    setEditingClassId(null)
    resetClassForm()
    setModal('class')
  }

  function openEditClassModal(cls: FitnessClass) {
    setEditingClassId(cls.id)
    setNewClassName(cls.name)
    setNewClassType(cls.class_type)
    setNewClassCapacity(cls.capacity)
    setNewClassTrainerId(cls.trainer_id ?? '')
    setNewClassDescription(cls.description ?? '')
    setNewClassDuration(cls.duration_minutes)
    setNewClassDeductSessions(cls.deduct_sessions)
    setNewClassWaitlist(cls.waitlist_enabled)
    const merged = emptyContentFields()
    const saved = normalizeClassContentFields(cls.content_fields)
    for (const field of DEFAULT_CLASS_CONTENT_FIELDS) {
      merged[field.key] = saved[field.key] ?? ''
    }
    setNewClassContentFields(merged)
    setModal('edit-class')
  }

  function closeClassModal() {
    setModal(null)
    setEditingClassId(null)
  }

  function openScheduleModal() {
    const firstClass = classes[0]
    setNewScheduleClassId(firstClass?.id ?? '')
    setNewScheduleDate(todayDateString())
    setNewScheduleTime('10:00')
    setNewScheduleCapacity(firstClass?.capacity ?? 8)
    setNewScheduleMode('single')
    setNewScheduleDays([1])
    setNewScheduleDayTimes({ 1: '10:00' })
    setNewScheduleWeeksAhead(8)
    setNewScheduleNote('')
    setModal('schedule')
  }

  function openEditFixedModal(fixed: ClassFixedSchedule) {
    setEditFixed(fixed)
    setEditFixedDays(getClassFixedDaysOfWeek(fixed))
    setEditFixedDayTimes(getClassFixedDayTimes(fixed))
    setEditFixedWeeksAhead(fixed.weeks_ahead)
    setEditFixedCapacity(fixed.capacity ?? 8)
    setEditFixedNote(fixed.note ?? '')
    setModal('edit-fixed')
  }

  function toggleScheduleDay(day: number) {
    setNewScheduleDays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((item) => item !== day)
        setNewScheduleDayTimes((times) => {
          const copy = { ...times }
          delete copy[day]
          return copy
        })
        return next.length > 0 ? next : prev
      }
      setNewScheduleDayTimes((times) => ({
        ...times,
        [day]: times[day] ?? newScheduleTime,
      }))
      return [...prev, day].sort((a, b) => a - b)
    })
  }

  function toggleEditFixedDay(day: number) {
    setEditFixedDays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((item) => item !== day)
        setEditFixedDayTimes((times) => {
          const copy = { ...times }
          delete copy[day]
          return copy
        })
        return next.length > 0 ? next : prev
      }
      setEditFixedDayTimes((times) => ({
        ...times,
        [day]: times[day] ?? editFixed?.time_of_day ?? '10:00',
      }))
      return [...prev, day].sort((a, b) => a - b)
    })
  }

  const fixedSchedulePreviewCount = useMemo(() => {
    if (newScheduleMode !== 'fixed' || newScheduleDays.length === 0) return 0
    const dayTimes = Object.fromEntries(
      newScheduleDays.map((day) => [day, newScheduleDayTimes[day] ?? newScheduleTime]),
    ) as DayTimeMap
    return buildClassFixedScheduleDatesWithTimes(dayTimes, newScheduleWeeksAhead).length
  }, [
    newScheduleMode,
    newScheduleDays,
    newScheduleDayTimes,
    newScheduleTime,
    newScheduleWeeksAhead,
  ])

  function handleScheduleClassChange(classId: string) {
    setNewScheduleClassId(classId)
    const cls = classes.find((c) => c.id === classId)
    if (cls) setNewScheduleCapacity(cls.capacity)
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) {
      setError('클래스 이름을 입력해 주세요.')
      return
    }
    if (newClassCapacity < 1) {
      setError('정원은 1명 이상이어야 합니다.')
      return
    }
    await runAction(async () => {
      await createClass({
        name: newClassName.trim(),
        description: newClassDescription,
        content_fields: newClassContentFields,
        class_type: newClassType,
        capacity: newClassCapacity,
        duration_minutes: newClassDuration,
        deduct_sessions: newClassDeductSessions,
        waitlist_enabled: newClassWaitlist,
        trainer_id: newClassTrainerId || null,
      })
      setModal(null)
      setEditingClassId(null)
      resetClassForm()
      await load()
    }, '클래스가 등록되었습니다.')
  }

  async function handleUpdateClass() {
    if (!editingClassId) return
    if (!newClassName.trim()) {
      setError('클래스 이름을 입력해 주세요.')
      return
    }
    if (newClassCapacity < 1) {
      setError('정원은 1명 이상이어야 합니다.')
      return
    }
    await runAction(async () => {
      await updateClass(editingClassId, {
        name: newClassName.trim(),
        description: newClassDescription.trim() || null,
        content_fields: newClassContentFields,
        class_type: newClassType,
        pass_type: newClassType,
        capacity: newClassCapacity,
        duration_minutes: newClassDuration,
        deduct_sessions: newClassDeductSessions,
        waitlist_enabled: newClassWaitlist,
        trainer_id: newClassTrainerId || null,
      })
      closeClassModal()
      await load()
    }, '클래스가 수정되었습니다.')
  }

  async function handleDeleteClass(cls: FitnessClass) {
    if (
      !window.confirm(
        `"${cls.name}" 클래스를 삭제할까요?\n새 일정 등록 목록에서 제외되며, 기존 일정은 유지됩니다.`,
      )
    ) {
      return
    }
    await runAction(async () => {
      await deleteClass(cls.id)
      if (selectedSchedule?.class_id === cls.id) {
        setSelectedSchedule(null)
        setReservations([])
      }
      await load()
    }, `"${cls.name}" 클래스가 삭제되었습니다.`)
  }

  async function handleUpdateFixedSchedule() {
    if (!editFixed) return
    if (editFixedDays.length === 0) {
      setError('최소 1개 요일을 선택해 주세요.')
      return
    }
    await runAction(async () => {
      const dayTimes = Object.fromEntries(
        editFixedDays.map((day) => [
          day,
          editFixedDayTimes[day] ?? editFixed.time_of_day,
        ]),
      ) as DayTimeMap
      const count = await updateClassFixedScheduleSeries(editFixed.id, {
        days_of_week: editFixedDays,
        day_times: dayTimes,
        capacity: editFixedCapacity,
        weeks_ahead: editFixedWeeksAhead,
        note: editFixedNote,
      })
      setModal(null)
      setEditFixed(null)
      await load()
      setToast(`고정 일정 변경 · ${count}건`)
    }, '고정 일정이 수정되었습니다.')
  }

  async function handleCreateSchedule() {
    if (!newScheduleClassId) {
      setError('클래스를 선택해 주세요.')
      return
    }
    if (newScheduleCapacity < 1) {
      setError('정원은 1명 이상이어야 합니다.')
      return
    }
    const cls = classes.find((c) => c.id === newScheduleClassId)
    const duration = cls?.duration_minutes ?? 60

    if (newScheduleMode === 'fixed') {
      if (newScheduleDays.length === 0) {
        setError('최소 1개 요일을 선택해 주세요.')
        return
      }
      await runAction(async () => {
        const dayTimes = Object.fromEntries(
          newScheduleDays.map((day) => [day, newScheduleDayTimes[day] ?? newScheduleTime]),
        ) as DayTimeMap
        const result = await createClassFixedSchedule({
          class_id: newScheduleClassId,
          days_of_week: newScheduleDays,
          day_times: dayTimes,
          time_of_day: newScheduleTime,
          capacity: newScheduleCapacity,
          weeks_ahead: newScheduleWeeksAhead,
          note: newScheduleNote,
          duration_minutes: duration,
        })
        setModal(null)
        await load()
        setToast(
          `고정 일정 등록 · ${result.createdCount}건 생성 (${newScheduleWeeksAhead}주)`,
        )
      }, '고정 일정이 추가되었습니다.')
      return
    }

    const starts = new Date(`${newScheduleDate}T${newScheduleTime}:00`)
    const ends = new Date(starts.getTime() + duration * 60 * 1000)
    await runAction(async () => {
      await createClassSchedule({
        class_id: newScheduleClassId,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        capacity: newScheduleCapacity,
        note: newScheduleNote,
      })
      setModal(null)
      await load()
    }, '일정이 추가되었습니다.')
  }

  async function handleReserve() {
    if (!selectedSchedule) return
    const member = reserveTargetMember
    if (!member) {
      setError(
        reserveAmbiguous
          ? '검색 결과가 여러 명입니다. 목록에서 회원을 선택해 주세요.'
          : '예약할 회원을 검색한 뒤 목록에서 선택해 주세요.',
      )
      return
    }
    if (
      !window.confirm(
        `${member.name} 님을 ${selectedSchedule.class_name} 수업에 예약하시겠습니까?`,
      )
    ) {
      return
    }
    await runAction(async () => {
      await reserveClassForMember({
        scheduleId: selectedSchedule.id,
        memberId: member.id,
      })
      setReserveMember(null)
      setReserveQuery('')
      await openSchedule(selectedSchedule)
      await load()
    }, `${member.name} 님 예약 완료`)
  }

  async function handleDeleteSchedule() {
    if (!selectedSchedule) return
    const activeCount = reservations.filter((r) => r.status !== 'cancelled').length
    const scheduleLabel = `${selectedSchedule.class_name} · ${formatDayHeading(selectedSchedule.starts_at.slice(0, 10))} ${formatTime(selectedSchedule.starts_at)}`
    const message =
      activeCount > 0
        ? `${scheduleLabel}\n이 수업 일정을 취소하시겠습니까?\n예약 ${activeCount}건도 함께 취소됩니다.`
        : `${scheduleLabel}\n이 수업 일정을 취소하시겠습니까?`
    if (!window.confirm(message)) return

    await runAction(async () => {
      await cancelClassSchedule(selectedSchedule.id)
      setSelectedSchedule(null)
      setReservations([])
      setReserveMember(null)
      setReserveQuery('')
      await load()
    }, '일정이 취소되었습니다.')
  }

  function confirmReservationAction(
    reservation: ClassReservation,
    status: ReservationStatus,
  ): boolean {
    const name = reservation.member_name ?? '회원'
    if (status === 'attended') {
      return window.confirm(`${name} 님을 출석 처리하시겠습니까?\n회차권이 차감될 수 있습니다.`)
    }
    if (status === 'noshow') {
      return window.confirm(`${name} 님을 노쇼 처리하시겠습니까?`)
    }
    if (status === 'cancelled') {
      return window.confirm(`${name} 님의 예약을 취소하시겠습니까?`)
    }
    return true
  }

  async function handleStatusChange(reservation: ClassReservation, status: ReservationStatus) {
    if (!selectedSchedule) return
    const cls = classes.find((c) => c.id === selectedSchedule.class_id)
    if (!cls) return
    if (!confirmReservationAction(reservation, status)) return

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
        helpText={PAGE_HELP.classes}
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
            onClick={openClassModal}
          >
            + 클래스
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={actionLoading || classes.length === 0}
            onClick={openScheduleModal}
          >
            + 일정
          </button>
        </div>
      </div>

      <section className={`${cardClass} card-pad`}>
        <h2 className="mb-3 text-sm font-semibold text-charcoal">등록된 클래스</h2>
        {loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted">등록된 클래스가 없습니다. + 클래스로 추가하세요.</p>
        ) : (
          <ul className="space-y-2">
            {classes.map((cls) => (
              <li
                key={cls.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/20 bg-white px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-charcoal">{cls.name}</p>
                  <p className="text-xs text-muted">
                    {CLASS_TYPE_LABELS[cls.class_type]} · {cls.duration_minutes}분 · 정원{' '}
                    {cls.capacity}명
                    {cls.trainer_name ? ` · ${cls.trainer_name}` : ' · 선생님 미지정'}
                    {cls.deduct_sessions ? '' : ' · 회차 미차감'}
                    {cls.waitlist_enabled ? ' · 대기 가능' : ''}
                  </p>
                  {(cls.description || classContentPreview(cls.content_fields)) && (
                    <p className="mt-1 line-clamp-2 text-xs text-charcoal/70">
                      {cls.description || classContentPreview(cls.content_fields)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    className={btnOutline}
                    onClick={() => openEditClassModal(cls)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    onClick={() => void handleDeleteClass(cls)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {fixedSchedules.length > 0 && (
        <section className={`${cardClass} card-pad`}>
          <h2 className="mb-3 text-sm font-semibold text-charcoal">고정 일정</h2>
          <ul className="space-y-2">
            {fixedSchedules.map((fixed) => (
              <li
                key={fixed.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/20 bg-white px-3 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-charcoal">
                    {classNameById.get(fixed.class_id) ?? '클래스'}
                  </p>
                  <p className="text-xs text-charcoal/65">
                    {formatClassFixedScheduleTimes(fixed)} · {fixed.weeks_ahead}주 앞까지
                    {fixed.capacity ? ` · 정원 ${fixed.capacity}명` : ''}
                  </p>
                  {fixed.note && (
                    <p className="mt-0.5 text-xs text-muted">메모: {fixed.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    className={btnOutline}
                    onClick={() => openEditFixedModal(fixed)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    className={btnOutline}
                    onClick={() =>
                      void runAction(async () => {
                        const n = await syncClassFixedScheduleAhead(fixed.id)
                        await load()
                        setToast(n > 0 ? `일정 보충 · ${n}건` : '추가 일정 없음')
                      }, '일정 보충 완료')
                    }
                  >
                    일정 보충
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (!window.confirm('고정 일정을 비활성화하고 미래 일정을 취소할까요?')) {
                        return
                      }
                      void runAction(async () => {
                        const n = await deactivateClassFixedSchedule(fixed.id)
                        await load()
                        setToast(`고정 일정 취소 · ${n}건`)
                      }, '고정 일정이 비활성화되었습니다.')
                    }}
                  >
                    비활성화
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                                  {s.trainer_name ? (
                                    <span className="ml-1 font-normal text-muted">
                                      · {s.trainer_name}
                                    </span>
                                  ) : null}
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-charcoal">
                    {selectedSchedule.class_name}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDayHeading(selectedSchedule.starts_at.slice(0, 10))}{' '}
                    {formatTime(selectedSchedule.starts_at)} ·{' '}
                    {CLASS_TYPE_LABELS[selectedSchedule.class_type ?? 'pilates']}
                    {selectedSchedule.trainer_name
                      ? ` · ${selectedSchedule.trainer_name}`
                      : ''}{' '}
                    · 예약 {selectedSchedule.reserved_count ?? 0}/
                    {selectedSchedule.capacity ?? 8}
                    {selectedSchedule.fixed_schedule_id ? ' · 고정' : ''}
                  </p>
                  {selectedClass && (
                    <div className="mt-2 space-y-1 text-xs text-charcoal/70">
                      {selectedClass.description && <p>{selectedClass.description}</p>}
                      {DEFAULT_CLASS_CONTENT_FIELDS.filter(
                        (field) =>
                          field.key !== 'notes' &&
                          normalizeClassContentFields(selectedClass.content_fields)[field.key],
                      ).map((field) => (
                        <p key={field.key}>
                          <span className="font-medium text-charcoal/80">{field.label}:</span>{' '}
                          {normalizeClassContentFields(selectedClass.content_fields)[field.key]}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  onClick={() => void handleDeleteSchedule()}
                >
                  일정 취소
                </button>
              </div>

              <div className="space-y-2 rounded-xl border border-gold/20 bg-cream/40 p-3">
                <p className="text-xs font-semibold text-charcoal">예약 추가</p>
                <p className="text-xs text-muted">
                  {scheduleRequiresPass
                    ? '해당 수업 수강권(잔여 회차)이 있는 회원만 예약할 수 있습니다.'
                    : '아래 회원을 눌러 선택한 뒤 예약하세요. 이름·전화번호로 검색할 수도 있습니다.'}
                </p>
                <MemberSearchCombobox
                  elevated
                  value={reserveQuery}
                  suggestions={reserveSuggestions}
                  onChange={(value) => {
                    setReserveQuery(value)
                    if (!value.trim()) setReserveMember(null)
                  }}
                  onSelect={(member) => {
                    setReserveMember(member)
                    setReserveQuery(member.name)
                  }}
                  onClear={() => setReserveMember(null)}
                />
                {reservePickList.length > 0 ? (
                  <ul className="max-h-44 overflow-y-auto rounded-xl border border-gold/25 bg-white divide-y divide-gold/15">
                    {reservePickList.map((member) => {
                      const selected = reserveTargetMember?.id === member.id
                      return (
                        <li key={member.id}>
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
                              selected
                                ? 'bg-gold/20 font-semibold text-charcoal'
                                : 'text-charcoal hover:bg-cream/80'
                            }`}
                            onClick={() => {
                              setReserveMember(member)
                              setReserveQuery(member.name)
                            }}
                          >
                            <span>{member.name}</span>
                            <span className="text-xs text-muted">
                              {formatPhone(member.phone)}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">
                    {scheduleRequiresPass
                      ? '수강권이 있는 회원이 없거나, 검색 결과가 없습니다.'
                      : reserveQuery.trim()
                        ? '검색 결과가 없거나 이미 예약된 회원입니다.'
                        : '예약 가능한 회원이 없습니다.'}
                  </p>
                )}
                {reserveAmbiguous && (
                  <p className="text-xs text-amber-800">
                    검색 결과가 여러 명입니다. 목록에서 회원을 눌러 선택하세요.
                  </p>
                )}
                {reserveTargetMember && (
                  <p className="text-xs font-medium text-emerald-800">
                    선택됨: {reserveTargetMember.name}
                  </p>
                )}
                <button
                  type="button"
                  className={`${btnPrimary} w-full`}
                  disabled={!reserveTargetMember || actionLoading}
                  onClick={() => void handleReserve()}
                >
                  {reserveTargetMember
                    ? `${reserveTargetMember.name} 님 예약`
                    : '회원을 선택해 주세요'}
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
          <div
            className={`${cardClass} max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto p-5 shadow-xl ${
              modal === 'edit-fixed' ? 'max-w-lg' : ''
            }`}
          >
            {modal === 'class' || modal === 'edit-class' ? (
              <>
                <h3 className="text-lg font-semibold">
                  {modal === 'edit-class' ? '클래스 수정' : '클래스 등록'}
                </h3>
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
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">담당 선생님</span>
                  <select
                    className={inputClass}
                    value={newClassTrainerId}
                    onChange={(e) => setNewClassTrainerId(e.target.value)}
                  >
                    <option value="">미지정</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-charcoal/70">기본 정원</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className={inputClass}
                      value={newClassCapacity}
                      onChange={(e) => setNewClassCapacity(Number(e.target.value) || 1)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-charcoal/70">수업 시간(분)</span>
                    <input
                      type="number"
                      min={15}
                      max={180}
                      className={inputClass}
                      value={newClassDuration}
                      onChange={(e) => setNewClassDuration(Number(e.target.value) || 60)}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">간단 설명</span>
                  <textarea
                    className={`${inputClass} min-h-[4rem] resize-y`}
                    placeholder="회원에게 보이는 한 줄 소개 (선택)"
                    value={newClassDescription}
                    onChange={(e) => setNewClassDescription(e.target.value)}
                  />
                </label>
                <div className="space-y-2 rounded-lg border border-gold/20 bg-cream/30 p-3">
                  <p className="text-xs font-semibold text-charcoal">수업 내용 정리</p>
                  {DEFAULT_CLASS_CONTENT_FIELDS.map((field) => (
                    <label key={field.key} className="block text-sm">
                      <span className="mb-1 block font-medium text-charcoal/70">
                        {field.label}
                      </span>
                      {field.multiline ? (
                        <textarea
                          className={`${inputClass} min-h-[3.5rem] resize-y`}
                          placeholder={field.placeholder}
                          value={newClassContentFields[field.key] ?? ''}
                          onChange={(e) =>
                            setNewClassContentFields((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <input
                          className={inputClass}
                          placeholder={field.placeholder}
                          value={newClassContentFields[field.key] ?? ''}
                          onChange={(e) =>
                            setNewClassContentFields((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newClassDeductSessions}
                      onChange={(e) => setNewClassDeductSessions(e.target.checked)}
                    />
                    수강권/회차 차감
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newClassWaitlist}
                      onChange={(e) => setNewClassWaitlist(e.target.checked)}
                    />
                    대기 예약 허용
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={actionLoading}
                    onClick={() =>
                      void (modal === 'edit-class' ? handleUpdateClass() : handleCreateClass())
                    }
                  >
                    {modal === 'edit-class' ? '저장' : '등록'}
                  </button>
                  <button type="button" className={btnOutline} onClick={closeClassModal}>
                    닫기
                  </button>
                </div>
              </>
            ) : modal === 'edit-fixed' && editFixed ? (
              <>
                <h3 className="text-lg font-semibold">고정 일정 수정</h3>
                <p className="text-sm text-muted">
                  {classNameById.get(editFixed.class_id) ?? '클래스'} · 분리되지 않은 미래 일정에
                  반영됩니다.
                </p>
                <div>
                  <p className="mb-2 text-sm font-medium text-charcoal/70">반복 요일</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((label, day) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleEditFixedDay(day)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                          editFixedDays.includes(day)
                            ? 'border-gold bg-gold/20 text-charcoal'
                            : 'border-gold/25 bg-white text-charcoal/60'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <FixedDayTimeFields
                  days={editFixedDays}
                  dayTimes={editFixedDayTimes}
                  defaultTime={editFixed.time_of_day}
                  onChange={(day, time) =>
                    setEditFixedDayTimes((prev) => ({ ...prev, [day]: time }))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-charcoal/70">생성 기간 (주)</span>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      className={inputClass}
                      value={editFixedWeeksAhead}
                      onChange={(e) =>
                        setEditFixedWeeksAhead(
                          Math.min(52, Math.max(1, Number(e.target.value) || 8)),
                        )
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-charcoal/70">정원</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className={inputClass}
                      value={editFixedCapacity}
                      onChange={(e) => setEditFixedCapacity(Number(e.target.value) || 1)}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">메모</span>
                  <input
                    className={inputClass}
                    value={editFixedNote}
                    onChange={(e) => setEditFixedNote(e.target.value)}
                    placeholder="선택 사항"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={actionLoading}
                    onClick={() => void handleUpdateFixedSchedule()}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    className={btnOutline}
                    onClick={() => {
                      setModal(null)
                      setEditFixed(null)
                    }}
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
                  onChange={(e) => handleScheduleClassChange(e.target.value)}
                >
                  <option value="">클래스 선택</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.trainer_name ? ` (${c.trainer_name})` : ''}
                    </option>
                  ))}
                </select>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">정원</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className={inputClass}
                    value={newScheduleCapacity}
                    onChange={(e) => setNewScheduleCapacity(Number(e.target.value) || 1)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">등록 방식</span>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={newScheduleMode === 'single'}
                        onChange={() => setNewScheduleMode('single')}
                      />
                      날짜 지정
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={newScheduleMode === 'fixed'}
                        onChange={() => setNewScheduleMode('fixed')}
                      />
                      고정 요일·시간
                    </label>
                  </div>
                </label>
                {newScheduleMode === 'single' ? (
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-charcoal/70">시간</span>
                    <input
                      type="time"
                      className={inputClass}
                      value={newScheduleTime}
                      onChange={(e) => setNewScheduleTime(e.target.value)}
                    />
                  </label>
                ) : null}
                {newScheduleMode === 'single' ? (
                  <input
                    type="date"
                    className={inputClass}
                    value={newScheduleDate}
                    onChange={(e) => setNewScheduleDate(e.target.value)}
                  />
                ) : (
                  <>
                    <div>
                      <p className="mb-2 text-sm font-medium text-charcoal/70">반복 요일</p>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAYS.map((label, day) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleScheduleDay(day)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                              newScheduleDays.includes(day)
                                ? 'border-gold bg-gold/20 text-charcoal'
                                : 'border-gold/25 bg-white text-charcoal/60'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <FixedDayTimeFields
                      days={newScheduleDays}
                      dayTimes={newScheduleDayTimes}
                      defaultTime={newScheduleTime}
                      onChange={(day, time) =>
                        setNewScheduleDayTimes((prev) => ({ ...prev, [day]: time }))
                      }
                    />
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-charcoal/70">
                        생성 기간 (주)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={52}
                        className={inputClass}
                        value={newScheduleWeeksAhead}
                        onChange={(e) =>
                          setNewScheduleWeeksAhead(
                            Math.min(52, Math.max(1, Number(e.target.value) || 8)),
                          )
                        }
                      />
                    </label>
                    <p className="text-xs text-muted">
                      약 {fixedSchedulePreviewCount}건의 일정이 생성됩니다.
                    </p>
                  </>
                )}
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">메모</span>
                  <input
                    className={inputClass}
                    value={newScheduleNote}
                    onChange={(e) => setNewScheduleNote(e.target.value)}
                    placeholder="선택 사항"
                  />
                </label>
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
