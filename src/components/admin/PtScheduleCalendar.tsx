import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { fetchMembers } from '../../api/members'
import { fetchTrainers } from '../../api/trainers'
import {
  exerciseJournalLookupKey,
  fetchExerciseJournalKeysInRange,
} from '../../api/exerciseJournals'
import {
  cancelAllFutureFixedSchedules,
  cancelScheduleWithSessionRestore,
  createFixedSchedule,
  deleteScheduleAdmin,
  fetchFixedSchedules,
  getFixedDayTimes,
  getFixedDaysOfWeek,
  syncFixedScheduleToRemaining,
  updateDetachedSchedule,
  updateFixedScheduleSeries,
  type PtFixedSchedule,
} from '../../api/fixedSchedule'
import {
  createSchedule,
  DEFAULT_PT_DURATION_MINUTES,
  fetchSchedulesInRange,
  updateScheduleStatus,
  type PtSchedule,
  type ScheduleStatus,
} from '../../api/schedule'
import { completeScheduleAttendance } from '../../api/attendance'
import { fetchClassSchedulesInRange, type ClassSchedule } from '../../api/classes'
import { formatSupabaseError } from '../../lib/errors'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import type { Member, Trainer } from '../../types/database'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import { dateKey, getMonthMatrix, monthLabel, WEEKDAYS } from '../../utils/calendar'
import {
  buildMultiDayScheduleDatesWithTimes,
  scheduleDateKey,
  scheduleTimeHHMM,
  toLocalScheduleIso,
  type DayTimeMap,
} from '../../utils/fixedScheduleDates'

type FormMode = 'single' | 'fixed'

function formatDaysLabel(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS[d])
    .join(', ')
}

function formatFixedScheduleTimes(fixed: PtFixedSchedule): string {
  const days = getFixedDaysOfWeek(fixed)
  const dayTimes = getFixedDayTimes(fixed)
  const uniqueTimes = new Set(days.map((day) => dayTimes[day]))
  if (uniqueTimes.size <= 1) {
    return `매주 ${formatDaysLabel(days)} ${dayTimes[days[0]] ?? fixed.time_of_day}`
  }
  return days.map((day) => `${WEEKDAYS[day]} ${dayTimes[day]}`).join(' · ')
}

function FixedDayTimeFields({
  days,
  dayTimes,
  defaultTime,
  onChange,
}: {
  days: number[]
  dayTimes: DayTimeMap
  defaultTime: string
  onChange: (day: number, time: string) => void
}) {
  if (days.length === 0) return null

  return (
    <div className="space-y-2 rounded-lg border border-gold/20 bg-cream/40 p-3">
      <p className="text-xs font-medium text-charcoal/70">요일별 시간</p>
      {days.map((day) => (
        <label key={day} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-[3rem] font-medium text-charcoal">{WEEKDAYS[day]}</span>
          <input
            type="time"
            required
            value={dayTimes[day] ?? defaultTime}
            onChange={(e) => onChange(day, e.target.value)}
            className={`${inputClass} min-w-0 flex-1`}
          />
        </label>
      ))}
    </div>
  )
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  scheduled: '예정',
  completed: '완료',
  cancelled: '취소',
  no_show: '노쇼',
}

const STATUS_COLORS: Record<ScheduleStatus, string> = {
  scheduled: 'bg-gold text-charcoal',
  completed: 'bg-green-500',
  cancelled: 'bg-charcoal/25',
  no_show: 'bg-red-400',
}

const STATUS_BADGE: Record<ScheduleStatus, string> = {
  scheduled: 'bg-gold/25 text-charcoal',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-charcoal/10 text-charcoal/50',
  no_show: 'bg-red-100 text-red-800',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  onToast?: (msg: string) => void
  lockedTrainerId?: string
  filterTrainerId?: string
  isAdmin?: boolean
  showClassSchedules?: boolean
}

export function PtScheduleCalendar({
  onToast,
  lockedTrainerId,
  filterTrainerId,
  isAdmin = false,
  showClassSchedules = false,
}: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(dateKey(now))
  const [schedules, setSchedules] = useState<PtSchedule[]>([])
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([])
  const [journalKeys, setJournalKeys] = useState<Set<string>>(new Set())
  const [members, setMembers] = useState<Member[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formMode, setFormMode] = useState<FormMode>('single')
  const [formMemberId, setFormMemberId] = useState('')
  const [formTrainerId, setFormTrainerId] = useState('')
  const [formTime, setFormTime] = useState('10:00')
  const [formNote, setFormNote] = useState('')
  const [formDays, setFormDays] = useState<number[]>([1])
  const [formDayTimes, setFormDayTimes] = useState<DayTimeMap>({ 1: '10:00' })
  const [fixedList, setFixedList] = useState<PtFixedSchedule[]>([])

  const [editSchedule, setEditSchedule] = useState<PtSchedule | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('10:00')
  const [editTrainerId, setEditTrainerId] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editSeries, setEditSeries] = useState(false)
  const [editSeriesDays, setEditSeriesDays] = useState<number[]>([1])
  const [editFixedDayTimes, setEditFixedDayTimes] = useState<DayTimeMap>({ 1: '10:00' })

  const [editFixed, setEditFixed] = useState<PtFixedSchedule | null>(null)

  const effectiveTrainerId = lockedTrainerId ?? filterTrainerId
  const canManage = isAdmin || Boolean(lockedTrainerId)
  const { features } = useCenterFeatures()
  const journalFeatureEnabled = features?.exercise_log !== false

  const range = useMemo(() => {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59)
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      startDate: dateKey(start),
      endDate: dateKey(end),
    }
  }, [year, month])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [scheduleData, memberData, trainerData, fixedData, journalKeySet, classData] =
        await Promise.all([
        fetchSchedulesInRange(range.startIso, range.endIso, {
          trainerId: effectiveTrainerId || undefined,
        }),
        fetchMembers(),
        fetchTrainers(),
        fetchFixedSchedules({
          trainerId: effectiveTrainerId || undefined,
          activeOnly: true,
        }),
        journalFeatureEnabled
          ? fetchExerciseJournalKeysInRange(range.startDate, range.endDate)
          : Promise.resolve(new Set<string>()),
        showClassSchedules
          ? fetchClassSchedulesInRange(range.startIso, range.endIso)
          : Promise.resolve([] as ClassSchedule[]),
      ])
      const memberMap = new Map(memberData.map((m) => [m.id, m.name]))
      const trainerMap = new Map(trainerData.map((t) => [t.id, t.name]))
      const enriched = scheduleData.map((s) => ({
        ...s,
        member_name: memberMap.get(s.member_id),
        trainer_name: s.trainer_id ? trainerMap.get(s.trainer_id) : undefined,
      }))
      setSchedules(enriched)
      const filteredClassSchedules = effectiveTrainerId
        ? classData.filter((item) => item.trainer_id === effectiveTrainerId)
        : classData
      setClassSchedules(filteredClassSchedules)
      setJournalKeys(journalKeySet)
      const activeMembers = memberData.filter((m) => m.status !== 'terminated')
      setMembers(
        lockedTrainerId
          ? activeMembers.filter((member) => member.trainer_id === lockedTrainerId)
          : activeMembers,
      )
      setTrainers(trainerData)
      setFixedList(fixedData)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [range.startIso, range.endIso, range.startDate, range.endDate, effectiveTrainerId, lockedTrainerId, journalFeatureEnabled, showClassSchedules])

  useEffect(() => {
    void load()
  }, [load])

  const selectedMember = useMemo(
    () => members.find((m) => m.id === formMemberId),
    [members, formMemberId],
  )

  const fixedPreviewCount = useMemo(() => {
    if (!selectedMember || formDays.length === 0) return 0
    const dayTimes = Object.fromEntries(
      formDays.map((day) => [day, formDayTimes[day] ?? formTime]),
    ) as DayTimeMap
    return buildMultiDayScheduleDatesWithTimes(
      dayTimes,
      selectedMember.remaining_sessions,
    ).length
  }, [selectedMember, formDays, formDayTimes, formTime])

  const memberNameById = useMemo(
    () => new Map(members.map((m) => [m.id, m.name])),
    [members],
  )

  function toggleFormDay(day: number) {
    setFormDays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((d) => d !== day)
        setFormDayTimes((times) => {
          const copy = { ...times }
          delete copy[day]
          return copy
        })
        return next.length > 0 ? next : prev
      }
      setFormDayTimes((times) => ({
        ...times,
        [day]: times[day] ?? formTime,
      }))
      return [...prev, day].sort((a, b) => a - b)
    })
  }

  function toggleEditSeriesDay(day: number) {
    setEditSeriesDays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((d) => d !== day)
        setEditFixedDayTimes((times) => {
          const copy = { ...times }
          delete copy[day]
          return copy
        })
        return next.length > 0 ? next : prev
      }
      setEditFixedDayTimes((times) => ({
        ...times,
        [day]: times[day] ?? editTime,
      }))
      return [...prev, day].sort((a, b) => a - b)
    })
  }

  useEffect(() => {
    if (lockedTrainerId) setFormTrainerId(lockedTrainerId)
  }, [lockedTrainerId])

  const byDate = useMemo(() => {
    const map = new Map<string, PtSchedule[]>()
    for (const s of schedules) {
      const key = dateKey(new Date(s.scheduled_at))
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      )
    }
    return map
  }, [schedules])

  const classByDate = useMemo(() => {
    const map = new Map<string, ClassSchedule[]>()
    for (const schedule of classSchedules) {
      const key = dateKey(new Date(schedule.starts_at))
      const list = map.get(key) ?? []
      list.push(schedule)
      map.set(key, list)
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      )
    }
    return map
  }, [classSchedules])

  const selectedSchedules = selectedDate ? (byDate.get(selectedDate) ?? []) : []
  const selectedClassSchedules = selectedDate
    ? (classByDate.get(selectedDate) ?? [])
    : []
  const matrix = getMonthMatrix(year, month)
  const today = dateKey(now)

  function scheduleNeedsJournal(schedule: PtSchedule): boolean {
    if (schedule.status !== 'completed' || !journalFeatureEnabled) return false
    const day = scheduleDateKey(schedule.scheduled_at)
    return !journalKeys.has(exerciseJournalLookupKey(schedule.member_id, day))
  }

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formMemberId) return
    if (formMode === 'single' && !selectedDate) return
    if (formMode === 'fixed' && formDays.length === 0) return

    setSaving(true)
    setError(null)
    try {
      const member = members.find((m) => m.id === formMemberId)
      if (formMode === 'fixed') {
        const dayTimes = Object.fromEntries(
          formDays.map((day) => [day, formDayTimes[day] ?? formTime]),
        ) as DayTimeMap
        const { createdCount } = await createFixedSchedule({
          member_id: formMemberId,
          trainer_id: formTrainerId || member?.trainer_id || null,
          days_of_week: formDays,
          day_times: dayTimes,
          time_of_day: formTime,
          duration_minutes: DEFAULT_PT_DURATION_MINUTES,
          note: formNote,
        })
        onToast?.(`고정 수업 등록 · ${createdCount}회 일정 생성`)
      } else {
        await createSchedule({
          member_id: formMemberId,
          trainer_id: formTrainerId || member?.trainer_id || null,
          scheduled_at: toLocalScheduleIso(selectedDate!, formTime),
          duration_minutes: DEFAULT_PT_DURATION_MINUTES,
          note: formNote,
        })
        onToast?.(`${member?.name ?? '회원'} PT 예약 등록`)
      }
      setFormNote('')
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm('이 수업을 취소할까요? 해당 일 출석이 있으면 세션이 복구됩니다.')) {
      return
    }
    setError(null)
    try {
      await cancelScheduleWithSessionRestore(id)
      onToast?.('수업 취소됨 (출석 시 세션 복구)')
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  async function handleStatus(id: string, status: ScheduleStatus) {
    setError(null)
    try {
      await updateScheduleStatus(id, status)
      onToast?.(`스케줄 → ${STATUS_LABELS[status]}`)
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  async function handleComplete(schedule: PtSchedule) {
    if (
      !window.confirm(
        `${schedule.member_name ?? '회원'} 님 수업을 완료(출석) 처리할까요?\n해당 일 미출석이면 PT 1회가 차감됩니다.`,
      )
    ) {
      return
    }
    setError(null)
    try {
      const { member, alreadyAttended } = await completeScheduleAttendance(
        schedule.id,
      )
      onToast?.(
        alreadyAttended
          ? `${member.name} 님 수업 완료 처리됨`
          : `${member.name} 님 출석 완료 · 잔여 ${member.remaining_sessions}회`,
      )
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 PT 예약을 삭제할까요? 출석 처리된 경우 세션이 복구됩니다.')) {
      return
    }
    setError(null)
    try {
      await deleteScheduleAdmin(id)
      onToast?.('예약 삭제됨')
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  function openEdit(schedule: PtSchedule) {
    setEditSchedule(schedule)
    setEditDate(scheduleDateKey(schedule.scheduled_at))
    setEditTime(scheduleTimeHHMM(schedule.scheduled_at))
    setEditTrainerId(schedule.trainer_id ?? '')
    setEditNote(schedule.note ?? '')
    setEditSeries(false)
    setEditSeriesDays([new Date(schedule.scheduled_at).getDay()])
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editSchedule) return
    setSaving(true)
    setError(null)
    try {
      const scheduledAt = toLocalScheduleIso(editDate, editTime)
      if (editSeries && editSchedule.fixed_schedule_id && !editSchedule.is_detached) {
        await updateFixedScheduleSeries(editSchedule.fixed_schedule_id, {
          days_of_week: editSeriesDays,
          time_of_day: editTime,
          trainer_id: editTrainerId || null,
          note: editNote,
        })
        onToast?.('고정 수업 전체 변경 완료')
      } else {
        await updateDetachedSchedule(editSchedule.id, {
          scheduled_at: scheduledAt,
          trainer_id: editTrainerId || null,
          note: editNote,
        })
        onToast?.('개별 일정 변경 완료')
      }
      setEditSchedule(null)
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className={`${cardClass} card-pad`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={prevMonth} className={btnOutline} aria-label="이전 달">
            ←
          </button>
          <h3 className="text-lg font-bold whitespace-nowrap text-charcoal">
            {monthLabel(year, month)}
          </h3>
          <button type="button" onClick={nextMonth} className={btnOutline} aria-label="다음 달">
            →
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-charcoal/50">캘린더 불러오는 중…</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gold/20 bg-gold/20 text-center text-xs font-semibold text-charcoal/50">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={`bg-cream py-2 ${
                    i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-px grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gold/20 bg-gold/20">
              {matrix.flat().map((date, idx) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[4.5rem] bg-white sm:min-h-[5.5rem]"
                    />
                  )
                }
                const key = dateKey(date)
                const daySchedules = byDate.get(key) ?? []
                const dayClassSchedules = classByDate.get(key) ?? []
                const totalCount = daySchedules.length + dayClassSchedules.length
                const isSelected = selectedDate === key
                const isToday = key === today
                const dow = date.getDay()

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`flex min-h-[4.5rem] min-w-0 flex-col bg-white p-1.5 text-left transition sm:min-h-[5.5rem] sm:p-2 ${
                      isSelected ? 'ring-2 ring-inset ring-gold' : 'hover:bg-cream/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-0.5">
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? 'bg-charcoal text-cream'
                            : dow === 0
                              ? 'text-red-500'
                              : dow === 6
                                ? 'text-blue-500'
                                : 'text-charcoal'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {totalCount > 0 && (
                        <span className="shrink-0 rounded bg-charcoal/8 px-1 text-[10px] font-semibold text-charcoal/60 tabular-nums">
                          {totalCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-0.5 pt-1">
                      {daySchedules.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          title={`PT ${formatTime(s.scheduled_at)} ${s.member_name ?? ''}`}
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_COLORS[s.status]} ${
                            s.fixed_schedule_id ? 'ring-1 ring-charcoal/30' : ''
                          }`}
                        />
                      ))}
                      {dayClassSchedules.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          title={`그룹 ${formatTime(s.starts_at)} ${s.class_name ?? ''}`}
                          className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-charcoal/20"
                          style={{ backgroundColor: s.class_color ?? '#2dd4bf' }}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-charcoal/45">
              날짜를 선택하면 PT·그룹수업 일정을 확인할 수 있습니다. PT 차감은 출석
              처리 시에만 됩니다.
            </p>
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`${cardClass} card-pad min-w-0`}>
          <h3 className="font-bold whitespace-nowrap text-charcoal">
            {selectedDate
              ? `${selectedDate.replace(/-/g, '.')} 일정`
              : '일정 목록'}
            {selectedDate && (
              <span className="ml-2 text-sm font-normal text-charcoal/50">
                PT {selectedSchedules.length}건
                {showClassSchedules ? ` · 그룹 ${selectedClassSchedules.length}건` : ''}
              </span>
            )}
          </h3>
          {!selectedDate ? (
            <p className="mt-4 text-sm text-charcoal/50">
              캘린더에서 날짜를 선택해 주세요.
            </p>
          ) : selectedSchedules.length === 0 && selectedClassSchedules.length === 0 ? (
            <p className="mt-4 text-sm text-charcoal/50">예약이 없습니다.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {selectedSchedules.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-gold/20 bg-cream/40 p-3.5"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-charcoal">
                        <span className="tabular-nums">{formatTime(s.scheduled_at)}</span>
                        <span className="mx-1.5 text-charcoal/30">·</span>
                        <span>{s.member_name}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-charcoal/55">
                        {s.trainer_name ?? '트레이너 미지정'} · {s.duration_minutes}분
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.fixed_schedule_id && (
                          <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-charcoal/70">
                            {s.is_detached ? '고정·개별' : '고정'}
                          </span>
                        )}
                      </div>
                      {s.note && (
                        <p className="mt-1 truncate text-xs text-charcoal/65">{s.note}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUS_BADGE[s.status]}`}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                  {s.status === 'scheduled' && canManage && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      <button type="button" className="btn-ghost" onClick={() => openEdit(s)}>
                        변경
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => void handleCancel(s.id)}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="btn-ghost text-red-600"
                        onClick={() => void handleStatus(s.id, 'no_show')}
                      >
                        노쇼
                      </button>
                      {canManage && !lockedTrainerId && (
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-600/40 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                          onClick={() => void handleComplete(s)}
                        >
                          완료
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost text-red-800"
                        onClick={() => void handleDelete(s.id)}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                  {scheduleNeedsJournal(s) && (
                    <div className="mt-2.5">
                      <Link
                        to={`/admin/member/${s.member_id}/journal?date=${scheduleDateKey(s.scheduled_at)}`}
                        className="inline-flex rounded-lg border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs font-semibold text-charcoal transition hover:bg-gold/25"
                      >
                        운동일지 작성
                      </Link>
                    </div>
                  )}
                </li>
              ))}
              {showClassSchedules &&
                selectedClassSchedules.map((schedule) => (
                  <li
                    key={`class-${schedule.id}`}
                    className="rounded-xl border border-teal-200/60 bg-teal-50/40 p-3.5"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-charcoal">
                          <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                            그룹
                          </span>
                          <span className="ml-1.5 tabular-nums">
                            {formatTime(schedule.starts_at)}
                          </span>
                          <span className="mx-1.5 text-charcoal/30">·</span>
                          <span>{schedule.class_name}</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-charcoal/55">
                          {schedule.trainer_name ?? '강사 미지정'} · 예약{' '}
                          {schedule.reserved_count ?? 0}/{schedule.capacity ?? '-'}
                        </p>
                        {schedule.fixed_schedule_id && (
                          <span className="mt-1 inline-block rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-charcoal/70">
                            {schedule.is_detached ? '고정·개별' : '고정'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <Link
                        to="/admin/classes"
                        className="inline-flex rounded-lg border border-teal-600/30 bg-white px-2.5 py-1 text-xs font-semibold text-teal-900 transition hover:bg-teal-50"
                      >
                        클래스 관리에서 보기
                      </Link>
                    </div>
                  </li>
                ))}
            </ul>
          )}

          {fixedList.length > 0 && (
            <div className="mt-6 border-t border-gold/20 pt-4">
              <h4 className="text-xs font-semibold text-charcoal/65">등록된 고정 수업</h4>
              <ul className="mt-2 space-y-2">
                {fixedList.map((fixed) => (
                  <li
                    key={fixed.id}
                    className="rounded-lg border border-gold/20 bg-white/70 px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-charcoal">
                      {memberNameById.get(fixed.member_id) ?? '회원'}
                    </p>
                    <p className="mt-0.5 text-charcoal/60">
                      {formatFixedScheduleTimes(fixed)}
                    </p>
                    {canManage && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setEditFixed(fixed)
                            setEditSeriesDays(getFixedDaysOfWeek(fixed))
                            setEditFixedDayTimes(getFixedDayTimes(fixed))
                            setEditTrainerId(fixed.trainer_id ?? '')
                            setEditNote(fixed.note ?? '')
                          }}
                        >
                          전체 변경
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() =>
                            void syncFixedScheduleToRemaining(fixed.id)
                              .then((n) => {
                                onToast?.(
                                  n > 0 ? `잔여 동기화 · ${n}건 추가` : '추가 일정 없음',
                                )
                                return load()
                              })
                              .catch((err) => setError(formatSupabaseError(err)))
                          }
                        >
                          잔여 동기화
                        </button>
                        <button
                          type="button"
                          className="btn-ghost text-red-700"
                          onClick={() => {
                            if (!window.confirm('고정 수업을 전체 취소할까요?')) return
                            void cancelAllFutureFixedSchedules(fixed.id)
                              .then((n) => {
                                onToast?.(`고정 수업 취소 · ${n}건`)
                                return load()
                              })
                              .catch((err) => setError(formatSupabaseError(err)))
                          }}
                        >
                          전체 취소
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className={`${cardClass} card-pad min-w-0`}
        >
          <h3 className="font-bold text-charcoal">일정 등록</h3>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setFormMode('single')}
              className={`chip ${formMode === 'single' ? 'chip-active' : 'chip-inactive'}`}
            >
              개별
            </button>
            <button
              type="button"
              onClick={() => setFormMode('fixed')}
              className={`chip ${formMode === 'fixed' ? 'chip-active' : 'chip-inactive'}`}
            >
              고정
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            {formMode === 'fixed'
              ? '요일을 복수 선택하고, 요일마다 다른 시간을 설정할 수 있습니다. 잔여 세션 수만큼 자동 배치됩니다.'
              : '선택한 날짜에 단건 예약을 추가합니다.'}
          </p>

          <div className="mt-4 space-y-3">
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block font-medium text-charcoal/70">회원</span>
              <select
                required
                value={formMemberId}
                onChange={(e) => {
                  const id = e.target.value
                  setFormMemberId(id)
                  const m = members.find((x) => x.id === id)
                  if (m?.trainer_id) setFormTrainerId(m.trainer_id)
                }}
                className={inputClass}
              >
                <option value="">선택</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · 잔여 {m.remaining_sessions}회
                  </option>
                ))}
              </select>
            </label>

            {formMode === 'fixed' && (
              <>
                <div className="text-sm">
                  <span className="mb-1.5 block font-medium text-charcoal/70">요일</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleFormDay(index)}
                        className={`chip text-xs ${
                          formDays.includes(index) ? 'chip-active' : 'chip-inactive'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <FixedDayTimeFields
                  days={formDays}
                  dayTimes={formDayTimes}
                  defaultTime={formTime}
                  onChange={(day, time) =>
                    setFormDayTimes((prev) => ({ ...prev, [day]: time }))
                  }
                />
              </>
            )}

            {formMode === 'single' && (
              <p className="text-xs text-muted">
                날짜: {selectedDate?.replace(/-/g, '.') ?? '캘린더에서 날짜 선택'}
              </p>
            )}

            <label className="block min-w-0 text-sm">
              <span className="mb-1 block font-medium text-charcoal/70">트레이너</span>
              <select
                value={formTrainerId}
                onChange={(e) => setFormTrainerId(e.target.value)}
                disabled={Boolean(lockedTrainerId)}
                className={inputClass}
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
              {formMode === 'single' && (
                <label className="block min-w-0 text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">시간</span>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              <label
                className={`block min-w-0 text-sm ${formMode === 'fixed' ? 'col-span-2' : ''}`}
              >
                <span className="mb-1 block font-medium text-charcoal/70">수업</span>
                <input
                  type="text"
                  readOnly
                  value={`${DEFAULT_PT_DURATION_MINUTES}분`}
                  className={`${inputClass} bg-cream text-charcoal/80`}
                />
              </label>
            </div>

            {formMode === 'fixed' && selectedMember && (
              <p className="rounded-lg bg-cream/80 px-3 py-2 text-xs text-charcoal/75">
                잔여 <strong>{selectedMember.remaining_sessions}회</strong> → 약{' '}
                <strong>{fixedPreviewCount}개</strong> 일정 생성
              </p>
            )}

            <label className="block min-w-0 text-sm">
              <span className="mb-1 block font-medium text-charcoal/70">메모</span>
              <input
                type="text"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="선택 사항"
                className={inputClass}
              />
            </label>

            <button
              type="submit"
              disabled={
                saving ||
                (formMode === 'single' && !selectedDate) ||
                (formMode === 'fixed' && formDays.length === 0)
              }
              className={btnPrimary}
            >
              {saving
                ? '등록 중…'
                : formMode === 'fixed'
                  ? '고정 수업 등록'
                  : '예약 등록'}
            </button>
          </div>
        </form>
      </div>

      {editFixed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSaving(true)
              void updateFixedScheduleSeries(editFixed.id, {
                days_of_week: editSeriesDays,
                day_times: Object.fromEntries(
                  editSeriesDays.map((day) => [
                    day,
                    editFixedDayTimes[day] ?? editFixed.time_of_day,
                  ]),
                ) as DayTimeMap,
                trainer_id: editTrainerId || null,
                note: editNote,
              })
                .then((n) => {
                  onToast?.(`고정 수업 변경 · ${n}건`)
                  setEditFixed(null)
                  return load()
                })
                .catch((err) => setError(formatSupabaseError(err)))
                .finally(() => setSaving(false))
            }}
            className={`${cardClass} w-full max-w-md card-pad`}
          >
            <h3 className="font-bold text-charcoal">고정 수업 전체 변경</h3>
            <div className="mt-4 space-y-3">
              <div className="text-sm">
                <span className="mb-1.5 block font-medium text-charcoal/70">요일</span>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleEditSeriesDay(index)}
                      className={`chip text-xs ${
                        editSeriesDays.includes(index) ? 'chip-active' : 'chip-inactive'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <FixedDayTimeFields
                days={editSeriesDays}
                dayTimes={editFixedDayTimes}
                defaultTime={editFixed.time_of_day}
                onChange={(day, time) =>
                  setEditFixedDayTimes((prev) => ({ ...prev, [day]: time }))
                }
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">트레이너</span>
                <select
                  value={editTrainerId}
                  onChange={(e) => setEditTrainerId(e.target.value)}
                  disabled={Boolean(lockedTrainerId)}
                  className={inputClass}
                >
                  <option value="">미지정</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">메모</span>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnOutline} onClick={() => setEditFixed(null)}>
                닫기
              </button>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
          <form
            onSubmit={(e) => void handleSaveEdit(e)}
            className={`${cardClass} w-full max-w-md card-pad`}
          >
            <h3 className="font-bold text-charcoal">일정 변경</h3>
            {editSchedule.fixed_schedule_id && !editSchedule.is_detached && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editSeries}
                  onChange={(e) => setEditSeries(e.target.checked)}
                />
                고정 수업 전체에 적용 (분리되지 않은 미래 일정)
              </label>
            )}
            {editSeries && editSchedule.fixed_schedule_id && !editSchedule.is_detached && (
              <div className="mt-3 text-sm">
                <span className="mb-1.5 block font-medium text-charcoal/70">요일</span>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleEditSeriesDay(index)}
                      className={`chip text-xs ${
                        editSeriesDays.includes(index) ? 'chip-active' : 'chip-inactive'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">날짜</span>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  disabled={editSeries}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">시간</span>
                <input
                  type="time"
                  required
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">트레이너</span>
                <select
                  value={editTrainerId}
                  onChange={(e) => setEditTrainerId(e.target.value)}
                  disabled={Boolean(lockedTrainerId)}
                  className={inputClass}
                >
                  <option value="">미지정</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">메모</span>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={btnOutline}
                onClick={() => setEditSchedule(null)}
              >
                닫기
              </button>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
