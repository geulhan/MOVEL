import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchMembers } from '../../api/members'
import { fetchTrainers } from '../../api/trainers'
import {
  cancelAllFutureFixedSchedules,
  createFixedSchedule,
  fetchFixedSchedules,
  syncFixedScheduleToRemaining,
  updateFixedScheduleSeries,
  type PtFixedSchedule,
} from '../../api/fixedSchedule'
import { DEFAULT_PT_DURATION_MINUTES } from '../../api/schedule'
import { formatSupabaseError } from '../../lib/errors'
import type { Member, Trainer } from '../../types/database'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import { WEEKDAYS } from '../../utils/calendar'
import { buildFixedScheduleDates } from '../../utils/fixedScheduleDates'

type Props = {
  onToast?: (msg: string) => void
  lockedTrainerId?: string
  filterTrainerId?: string
  onChanged?: () => void
}

export function FixedSchedulePanel({
  onToast,
  lockedTrainerId,
  filterTrainerId,
  onChanged,
}: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [fixedList, setFixedList] = useState<PtFixedSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formMemberId, setFormMemberId] = useState('')
  const [formTrainerId, setFormTrainerId] = useState('')
  const [formDay, setFormDay] = useState(1)
  const [formTime, setFormTime] = useState('10:00')
  const [formNote, setFormNote] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editDay, setEditDay] = useState(1)
  const [editTime, setEditTime] = useState('10:00')
  const [editTrainerId, setEditTrainerId] = useState('')
  const [editNote, setEditNote] = useState('')

  const effectiveTrainerFilter = lockedTrainerId ?? filterTrainerId

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [memberData, trainerData, fixedData] = await Promise.all([
        fetchMembers(),
        fetchTrainers(),
        fetchFixedSchedules({
          trainerId: effectiveTrainerFilter || undefined,
          activeOnly: true,
        }),
      ])
      const activeMembers = memberData.filter((m) => m.status !== 'terminated')
      setMembers(
        lockedTrainerId
          ? activeMembers.filter((m) => m.trainer_id === lockedTrainerId)
          : activeMembers,
      )
      setTrainers(trainerData)
      setFixedList(fixedData)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [effectiveTrainerFilter, lockedTrainerId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (lockedTrainerId) setFormTrainerId(lockedTrainerId)
  }, [lockedTrainerId])

  const selectedMember = useMemo(
    () => members.find((m) => m.id === formMemberId),
    [members, formMemberId],
  )

  const previewCount = useMemo(() => {
    if (!selectedMember || selectedMember.remaining_sessions <= 0) return 0
    return buildFixedScheduleDates(
      formDay,
      formTime,
      selectedMember.remaining_sessions,
    ).length
  }, [selectedMember, formDay, formTime])

  const memberNameById = useMemo(
    () => new Map(members.map((m) => [m.id, m.name])),
    [members],
  )
  const trainerNameById = useMemo(
    () => new Map(trainers.map((t) => [t.id, t.name])),
    [trainers],
  )

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!formMemberId) return
    setSaving(true)
    setError(null)
    try {
      const { createdCount } = await createFixedSchedule({
        member_id: formMemberId,
        trainer_id: formTrainerId || null,
        day_of_week: formDay,
        time_of_day: formTime,
        duration_minutes: DEFAULT_PT_DURATION_MINUTES,
        note: formNote,
      })
      onToast?.(`고정 수업 등록 · ${createdCount}회 일정 생성`)
      setFormNote('')
      await load()
      onChanged?.()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  function openEdit(fixed: PtFixedSchedule) {
    setEditId(fixed.id)
    setEditDay(fixed.day_of_week)
    setEditTime(fixed.time_of_day)
    setEditTrainerId(fixed.trainer_id ?? '')
    setEditNote(fixed.note ?? '')
  }

  async function handleEditSeries(e: FormEvent) {
    e.preventDefault()
    if (!editId) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateFixedScheduleSeries(editId, {
        day_of_week: editDay,
        time_of_day: editTime,
        trainer_id: editTrainerId || null,
        note: editNote,
      })
      onToast?.(`고정 수업 전체 변경 · ${updated}건 반영`)
      setEditId(null)
      await load()
      onChanged?.()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelAll(fixedId: string) {
    if (!window.confirm('앞으로 예정된 고정 수업을 모두 취소할까요?')) return
    setError(null)
    try {
      const n = await cancelAllFutureFixedSchedules(fixedId)
      onToast?.(`고정 수업 취소 · ${n}건`)
      await load()
      onChanged?.()
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  async function handleSync(fixedId: string) {
    setError(null)
    try {
      const n = await syncFixedScheduleToRemaining(fixedId)
      onToast?.(n > 0 ? `잔여 세션 맞춤 · ${n}건 추가` : '추가할 일정 없음')
      await load()
      onChanged?.()
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

      <form onSubmit={(e) => void handleCreate(e)} className={`${cardClass} card-pad`}>
        <h3 className="font-bold text-charcoal">고정 수업 등록</h3>
        <p className="mt-1 text-xs text-muted">
          요일·시간을 지정하면 잔여 세션 수만큼 자동으로 일정이 생성됩니다. PT
          차감은 출석 처리 시에만 됩니다.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block min-w-0 text-sm sm:col-span-2 lg:col-span-1">
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
            <span className="mb-1 block font-medium text-charcoal/70">요일</span>
            <select
              value={formDay}
              onChange={(e) => setFormDay(Number(e.target.value))}
              className={inputClass}
            >
              {WEEKDAYS.map((label, index) => (
                <option key={label} value={index}>
                  매주 {label}요일
                </option>
              ))}
            </select>
          </label>

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

          <label className="block min-w-0 text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-charcoal/70">메모</span>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="선택 사항"
              className={inputClass}
            />
          </label>
        </div>

        {selectedMember && (
          <p className="mt-3 rounded-lg bg-cream/80 px-3 py-2 text-xs text-charcoal/75">
            잔여 세션 <strong>{selectedMember.remaining_sessions}회</strong> →
            약 <strong>{previewCount}개</strong> 일정 생성 예정
            {previewCount < selectedMember.remaining_sessions &&
              ' (일부 날짜는 이미 지나 생성되지 않을 수 있습니다)'}
          </p>
        )}

        <button type="submit" disabled={saving} className={`${btnPrimary} mt-4`}>
          {saving ? '등록 중…' : '고정 수업 등록'}
        </button>
      </form>

      <div className={`${cardClass} card-pad`}>
        <h3 className="font-bold text-charcoal">등록된 고정 수업</h3>
        {loading ? (
          <p className="mt-4 text-sm text-muted">불러오는 중…</p>
        ) : fixedList.length === 0 ? (
          <p className="mt-4 text-sm text-muted">등록된 고정 수업이 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {fixedList.map((fixed) => (
              <li
                key={fixed.id}
                className="rounded-xl border border-gold/25 bg-cream/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-charcoal">
                      {memberNameById.get(fixed.member_id) ?? '회원'}
                    </p>
                    <p className="mt-0.5 text-sm text-charcoal/65">
                      매주 {WEEKDAYS[fixed.day_of_week]}요일 {fixed.time_of_day}{' '}
                      · {trainerNameById.get(fixed.trainer_id ?? '') ?? '미지정'}
                    </p>
                    {fixed.note && (
                      <p className="mt-1 text-xs text-muted">{fixed.note}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={() => openEdit(fixed)}
                    >
                      전체 변경
                    </button>
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={() => void handleSync(fixed.id)}
                    >
                      잔여 동기화
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-red-700"
                      onClick={() => void handleCancelAll(fixed.id)}
                    >
                      전체 취소
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
          <form
            onSubmit={(e) => void handleEditSeries(e)}
            className={`${cardClass} w-full max-w-md card-pad`}
          >
            <h3 className="font-bold text-charcoal">고정 수업 전체 변경</h3>
            <p className="mt-1 text-xs text-muted">
              분리되지 않은 미래 일정에 일괄 반영됩니다.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">요일</span>
                <select
                  value={editDay}
                  onChange={(e) => setEditDay(Number(e.target.value))}
                  className={inputClass}
                >
                  {WEEKDAYS.map((label, index) => (
                    <option key={label} value={index}>
                      매주 {label}요일
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">시간</span>
                <input
                  type="time"
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
                onClick={() => setEditId(null)}
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
