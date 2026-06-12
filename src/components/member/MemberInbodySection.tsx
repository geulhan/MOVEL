import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createInbodyRecord,
  deleteInbodyRecord,
  fetchInbodyRecords,
  type InbodyCreatedBy,
  type InbodyRecord,
} from '../../api/inbodyRecords'
import { formatDate } from '../../api/members'
import { formatSupabaseError } from '../../lib/errors'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import { bodyFatPercent, formatBodyFatPercent } from '../../lib/inbodyMetrics'
import { InbodyMuscleFatAnalysis } from './InbodyMuscleFatAnalysis'
import { InbodyTrendCharts } from './InbodyTrendCharts'

type Props = {
  memberId: string
  createdBy?: InbodyCreatedBy
  allowInput?: boolean
}

export function MemberInbodySection({
  memberId,
  createdBy = 'member',
  allowInput = true,
}: Props) {
  const [records, setRecords] = useState<InbodyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [measuredAt, setMeasuredAt] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [weight, setWeight] = useState('')
  const [muscle, setMuscle] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecords(await fetchInbodyRecords(memberId))
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const weightKg = Number(weight)
    const muscleKg = Number(muscle)
    const fatKg = Number(bodyFat)
    if (
      !Number.isFinite(weightKg) ||
      !Number.isFinite(muscleKg) ||
      !Number.isFinite(fatKg) ||
      weightKg <= 0 ||
      muscleKg <= 0 ||
      fatKg <= 0
    ) {
      setError('체중·골격근량·체지방량을 모두 입력해 주세요.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createInbodyRecord(memberId, {
        measured_at: measuredAt,
        weight_kg: weightKg,
        skeletal_muscle_kg: muscleKg,
        body_fat_kg: fatKg,
        created_by: createdBy,
      })
      setWeight('')
      setMuscle('')
      setBodyFat('')
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(recordId: string) {
    if (!window.confirm('이 인바디 기록을 삭제할까요?')) return
    setDeletingId(recordId)
    setError(null)
    try {
      await deleteInbodyRecord(recordId)
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setDeletingId(null)
    }
  }

  const latest = records[0] ?? null

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="border-b border-gold/20 px-4 py-4">
        <h3 className="font-semibold text-charcoal">인바디</h3>
        <p className="mt-1 text-xs text-muted">
          체중·골격근량·체지방량을 기록하면 그래프로 확인할 수 있으며, 체지방률은
          체지방량÷체중으로 자동 계산됩니다.
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-muted">불러오는 중…</p>
      ) : (
        <div className="space-y-4 p-4">
          {latest && (
            <InbodyMuscleFatAnalysis record={latest} history={records} />
          )}

          <InbodyTrendCharts records={records} />

          {allowInput && (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-3 rounded-xl border border-gold/25 bg-cream/30 p-4"
            >
              <p className="text-sm font-semibold text-charcoal">기록 추가</p>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">측정일</span>
                <input
                  type="date"
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">체중(kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={inputClass}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">골격근(kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value)}
                    className={inputClass}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">체지방(kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    className={inputClass}
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`w-full ${btnPrimary}`}
              >
                {saving ? '저장 중…' : '인바디 저장'}
              </button>
            </form>
          )}

          {records.length === 0 ? (
            <p className="text-center text-sm text-muted">
              등록된 인바디 기록이 없습니다.
            </p>
          ) : (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
                측정 이력
              </h4>
              <ul className="mt-2 divide-y divide-gold/15">
                {records.map((record) => (
                  <li
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium tabular-nums text-charcoal">
                        {formatDate(record.measured_at)}
                      </p>
                      <p className="text-xs text-muted">
                        체중 {record.weight_kg.toFixed(1)} · 골격근{' '}
                        {record.skeletal_muscle_kg.toFixed(1)} · 체지방{' '}
                        {record.body_fat_kg.toFixed(1)} · 체지방률{' '}
                        {formatBodyFatPercent(bodyFatPercent(record))}
                      </p>
                    </div>
                    {allowInput && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(record.id)}
                        disabled={deletingId === record.id}
                        className={btnOutline}
                      >
                        {deletingId === record.id ? '…' : '삭제'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
