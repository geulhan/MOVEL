import { useCallback, useEffect, useState } from 'react'
import {
  createMemberConsultation,
  deleteMemberConsultation,
  fetchMemberConsultations,
  updateMemberConsultation,
  type ConsultationInput,
  type MemberConsultation,
} from '../api/memberConsultations'
import { fetchMemberById } from '../api/memberDetail'
import { formatDate } from '../api/members'
import { fetchTrainers } from '../api/trainers'
import { formatSupabaseError } from '../lib/errors'
import type { Trainer } from '../types/database'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../styles/theme'

type FormState = {
  consulted_at: string
  trainer_id: string
  pain_status: string
  exercise_progress: string
  goals: string
  special_notes: string
}

const emptyForm = (date = new Date().toISOString().slice(0, 10)): FormState => ({
  consulted_at: date,
  trainer_id: '',
  pain_status: '',
  exercise_progress: '',
  goals: '',
  special_notes: '',
})

function toInput(form: FormState, trainers: Trainer[]): ConsultationInput {
  const trainer = trainers.find((t) => t.id === form.trainer_id)
  return {
    consulted_at: form.consulted_at,
    trainer_id: form.trainer_id || null,
    trainer_name: trainer?.name ?? null,
    pain_status: form.pain_status,
    exercise_progress: form.exercise_progress,
    goals: form.goals,
    special_notes: form.special_notes,
  }
}

function fromRecord(c: MemberConsultation): FormState {
  return {
    consulted_at: String(c.consulted_at).slice(0, 10),
    trainer_id: c.trainer_id ?? '',
    pain_status: c.pain_status,
    exercise_progress: c.exercise_progress,
    goals: c.goals,
    special_notes: c.special_notes,
  }
}

type Props = {
  memberId: string
}

function TimelineField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  if (!value.trim()) return null
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/45">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-charcoal/85">
        {value}
      </p>
    </div>
  )
}

function ConsultationForm({
  form,
  trainers,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
}: {
  form: FormState
  trainers: Trainer[]
  onChange: (next: FormState) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
  saving: boolean
}) {
  return (
    <div className="space-y-3 rounded-xl border border-gold/30 bg-cream/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0 text-sm">
          <span className="mb-1 block font-medium text-charcoal/70">상담일</span>
          <input
            type="date"
            required
            value={form.consulted_at}
            onChange={(e) => onChange({ ...form, consulted_at: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block min-w-0 text-sm">
          <span className="mb-1 block font-medium text-charcoal/70">
            작성자 (트레이너)
          </span>
          <select
            value={form.trainer_id}
            onChange={(e) => onChange({ ...form, trainer_id: e.target.value })}
            className={inputClass}
          >
            <option value="">선택</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {[
        { key: 'pain_status' as const, label: '통증 상태', rows: 2 },
        { key: 'exercise_progress' as const, label: '운동 진행상황', rows: 2 },
        { key: 'goals' as const, label: '목표', rows: 2 },
        { key: 'special_notes' as const, label: '특이사항', rows: 3 },
      ].map((field) => (
        <label key={field.key} className="block text-sm">
          <span className="mb-1 block font-medium text-charcoal/70">
            {field.label}
          </span>
          <textarea
            lang="ko"
            rows={field.rows}
            value={form[field.key]}
            onChange={(e) => onChange({ ...form, [field.key]: e.target.value })}
            className={`${inputClass} resize-y text-sm leading-relaxed`}
          />
        </label>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSubmit}
          className={btnPrimary}
        >
          {saving ? '저장 중…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={btnOutline}>
            취소
          </button>
        )}
      </div>
    </div>
  )
}

export function MemberConsultationTimeline({ memberId }: Props) {
  const [records, setRecords] = useState<MemberConsultation[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [defaultTrainerId, setDefaultTrainerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newForm, setNewForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, trainerList, member] = await Promise.all([
        fetchMemberConsultations(memberId),
        fetchTrainers(),
        fetchMemberById(memberId),
      ])
      setRecords(list)
      setTrainers(trainerList)
      const tid = member.trainer_id ?? ''
      setDefaultTrainerId(tid)
      setNewForm({ ...emptyForm(), trainer_id: tid })
    } catch (err) {
      setError(formatSupabaseError(err))
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      await createMemberConsultation(memberId, toInput(newForm, trainers))
      setShowForm(false)
      setNewForm({ ...emptyForm(), trainer_id: defaultTrainerId })
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(record: MemberConsultation) {
    setEditingId(record.id)
    setEditForm(fromRecord(record))
    setShowForm(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyForm())
  }

  async function handleUpdate(id: string) {
    setUpdatingId(id)
    setError(null)
    try {
      await updateMemberConsultation(id, toInput(editForm, trainers))
      cancelEdit()
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 상담기록을 삭제할까요?')) return
    setDeletingId(id)
    setError(null)
    try {
      await deleteMemberConsultation(id)
      if (editingId === id) cancelEdit()
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="card-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-charcoal">상담기록</h3>
          <p className="mt-0.5 text-xs text-muted">
            통증·진행·목표를 타임라인으로 관리합니다.
          </p>
        </div>
        {!showForm && !editingId && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true)
              setNewForm({ ...emptyForm(), trainer_id: defaultTrainerId })
            }}
            className={btnPrimary}
          >
            + 상담기록 추가
          </button>
        )}
      </div>

      <div className="space-y-4 px-5 py-4 sm:px-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <ConsultationForm
            form={newForm}
            trainers={trainers}
            onChange={setNewForm}
            onSubmit={() => void handleCreate()}
            onCancel={() => {
              setShowForm(false)
              setNewForm({ ...emptyForm(), trainer_id: defaultTrainerId })
            }}
            submitLabel="상담기록 저장"
            saving={saving}
          />
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>
        ) : records.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            등록된 상담기록이 없습니다.
          </p>
        ) : (
          <ol className="relative space-y-0 border-l-2 border-gold/30 pl-6">
            {records.map((record, index) => {
              const isEditing = editingId === record.id
              return (
                <li key={record.id} className="relative pb-8 last:pb-2">
                  <span
                    className={`absolute -left-[1.6rem] top-1 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white ${
                      index === 0 ? 'bg-gold' : 'bg-gold/50'
                    }`}
                  />
                  {isEditing ? (
                    <ConsultationForm
                      form={editForm}
                      trainers={trainers}
                      onChange={setEditForm}
                      onSubmit={() => void handleUpdate(record.id)}
                      onCancel={cancelEdit}
                      submitLabel={
                        updatingId === record.id ? '저장 중…' : '수정 저장'
                      }
                      saving={updatingId === record.id}
                    />
                  ) : (
                    <div className="rounded-xl border border-gold/25 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <time
                            dateTime={record.consulted_at}
                            className="text-sm font-bold text-charcoal tabular-nums"
                          >
                            {formatDate(record.consulted_at)}
                          </time>
                          <p className="mt-0.5 text-xs text-charcoal/55">
                            작성: {record.trainer_name ?? '미지정'}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(record)}
                            className="btn-ghost"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(record.id)}
                            disabled={deletingId === record.id}
                            className="btn-ghost text-red-600"
                          >
                            {deletingId === record.id ? '…' : '삭제'}
                          </button>
                        </div>
                      </div>
                      <TimelineField label="통증 상태" value={record.pain_status} />
                      <TimelineField
                        label="운동 진행상황"
                        value={record.exercise_progress}
                      />
                      <TimelineField label="목표" value={record.goals} />
                      <TimelineField label="특이사항" value={record.special_notes} />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
