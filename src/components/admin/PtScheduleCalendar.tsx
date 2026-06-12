import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchMembers } from '../../api/members'
import { fetchTrainers } from '../../api/trainers'
import {
  createSchedule,
  DEFAULT_PT_DURATION_MINUTES,
  deleteSchedule,
  fetchSchedulesInRange,
  updateScheduleStatus,
  type PtSchedule,
  type ScheduleStatus,
} from '../../api/schedule'
import { formatSupabaseError } from '../../lib/errors'
import type { Member, Trainer } from '../../types/database'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import { dateKey, getMonthMatrix, monthLabel, WEEKDAYS } from '../../utils/calendar'

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

function toLocalIso(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

type Props = {
  onToast?: (msg: string) => void
  trainerId?: string
}

export function PtScheduleCalendar({ onToast, trainerId }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(dateKey(now))
  const [schedules, setSchedules] = useState<PtSchedule[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formMemberId, setFormMemberId] = useState('')
  const [formTrainerId, setFormTrainerId] = useState('')
  const [formTime, setFormTime] = useState('10:00')
  const [formNote, setFormNote] = useState('')

  const range = useMemo(() => {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59)
    return { startIso: start.toISOString(), endIso: end.toISOString() }
  }, [year, month])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [scheduleData, memberData, trainerData] = await Promise.all([
        fetchSchedulesInRange(range.startIso, range.endIso),
        fetchMembers(),
        fetchTrainers(),
      ])
      const memberMap = new Map(memberData.map((m) => [m.id, m.name]))
      const trainerMap = new Map(trainerData.map((t) => [t.id, t.name]))
      const enriched = scheduleData.map((s) => ({
        ...s,
        member_name: memberMap.get(s.member_id),
        trainer_name: s.trainer_id ? trainerMap.get(s.trainer_id) : undefined,
      }))
      setSchedules(
        trainerId
          ? enriched.filter((schedule) => schedule.trainer_id === trainerId)
          : enriched,
      )
      const activeMembers = memberData.filter((m) => m.status !== 'terminated')
      setMembers(
        trainerId
          ? activeMembers.filter((member) => member.trainer_id === trainerId)
          : activeMembers,
      )
      setTrainers(trainerData)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [range.startIso, range.endIso, trainerId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (trainerId) {
      setFormTrainerId(trainerId)
    }
  }, [trainerId])

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

  const selectedSchedules = selectedDate ? (byDate.get(selectedDate) ?? []) : []
  const matrix = getMonthMatrix(year, month)
  const today = dateKey(now)

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

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!selectedDate || !formMemberId) return
    setSaving(true)
    setError(null)
    try {
      const member = members.find((m) => m.id === formMemberId)
      await createSchedule({
        member_id: formMemberId,
        trainer_id: formTrainerId || member?.trainer_id || null,
        scheduled_at: toLocalIso(selectedDate, formTime),
        duration_minutes: DEFAULT_PT_DURATION_MINUTES,
        note: formNote,
      })
      onToast?.(`${member?.name ?? '회원'} PT 예약 등록`)
      setFormNote('')
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
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

  async function handleDelete(id: string) {
    if (!window.confirm('이 PT 예약을 삭제할까요?')) return
    setError(null)
    try {
      await deleteSchedule(id)
      onToast?.('예약 삭제됨')
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
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
          <button
            type="button"
            onClick={prevMonth}
            className={btnOutline}
            aria-label="이전 달"
          >
            ←
          </button>
          <h3 className="text-lg font-bold whitespace-nowrap text-charcoal">
            {monthLabel(year, month)}
          </h3>
          <button
            type="button"
            onClick={nextMonth}
            className={btnOutline}
            aria-label="다음 달"
          >
            →
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-charcoal/50">
            캘린더 불러오는 중…
          </p>
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
                const isSelected = selectedDate === key
                const isToday = key === today
                const dow = date.getDay()

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`flex min-h-[4.5rem] min-w-0 flex-col bg-white p-1.5 text-left transition sm:min-h-[5.5rem] sm:p-2 ${
                      isSelected
                        ? 'ring-2 ring-inset ring-gold'
                        : 'hover:bg-cream/80'
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
                      {daySchedules.length > 0 && (
                        <span className="shrink-0 rounded bg-charcoal/8 px-1 text-[10px] font-semibold text-charcoal/60 tabular-nums">
                          {daySchedules.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-0.5 pt-1">
                      {daySchedules.slice(0, 6).map((s) => (
                        <span
                          key={s.id}
                          title={`${formatTime(s.scheduled_at)} ${s.member_name ?? ''}`}
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_COLORS[s.status]}`}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-charcoal/45">
              날짜를 선택하면 일정 목록과 예약 추가가 표시됩니다.
            </p>
          </>
        )}
      </div>

      {selectedDate && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`${cardClass} card-pad min-w-0`}>
            <h3 className="font-bold whitespace-nowrap text-charcoal">
              {selectedDate.replace(/-/g, '.')} 일정
              <span className="ml-2 text-sm font-normal text-charcoal/50">
                {selectedSchedules.length}건
              </span>
            </h3>
            {selectedSchedules.length === 0 ? (
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
                          <span className="tabular-nums">
                            {formatTime(s.scheduled_at)}
                          </span>
                          <span className="mx-1.5 text-charcoal/30">·</span>
                          <span>{s.member_name}</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-charcoal/55">
                          {s.trainer_name ?? '트레이너 미지정'} ·{' '}
                          {s.duration_minutes}분
                        </p>
                        {s.note && (
                          <p className="mt-1 truncate text-xs text-charcoal/65">
                            {s.note}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUS_BADGE[s.status]}`}
                      >
                        {STATUS_LABELS[s.status]}
                      </span>
                    </div>
                    {s.status === 'scheduled' && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn-ghost text-green-700"
                          onClick={() => void handleStatus(s.id, 'completed')}
                        >
                          완료
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => void handleStatus(s.id, 'cancelled')}
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
                        <button
                          type="button"
                          className="btn-ghost text-red-800"
                          onClick={() => void handleDelete(s.id)}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            onSubmit={(e) => void handleCreate(e)}
            className={`${cardClass} card-pad min-w-0`}
          >
            <h3 className="font-bold text-charcoal">PT 예약 추가</h3>
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
              <label className="block min-w-0 text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">
                  트레이너
                </span>
                <select
                  value={formTrainerId}
                  onChange={(e) => setFormTrainerId(e.target.value)}
                  disabled={Boolean(trainerId)}
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
                <label className="block min-w-0 text-sm">
                  <span className="mb-1 block font-medium text-charcoal/70">
                    수업 시간
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={`${DEFAULT_PT_DURATION_MINUTES}분`}
                    className={`${inputClass} bg-cream text-charcoal/80`}
                  />
                </label>
              </div>
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
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? '등록 중…' : '예약 등록'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
