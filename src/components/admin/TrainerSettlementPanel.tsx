import { useEffect, useState } from 'react'
import { fetchBusinessAnalyticsSettings } from '../../api/businessAnalyticsSettings'
import {
  updateTrainerSettlementRate,
} from '../../api/trainers'
import { formatSupabaseError } from '../../lib/errors'
import { btnOutline, cardClass, inputClass } from '../../styles/theme'
import type { Trainer } from '../../types/database'

type Props = {
  trainers: Trainer[]
  onUpdated: () => void
}

type DraftRate = {
  value: string
  useDefault: boolean
}

function toDraft(trainer: Trainer): DraftRate {
  if (trainer.settlement_rate == null) {
    return { value: '', useDefault: true }
  }
  return { value: String(trainer.settlement_rate), useDefault: false }
}

export function TrainerSettlementPanel({ trainers, onUpdated }: Props) {
  const [defaultRate, setDefaultRate] = useState(50)
  const [drafts, setDrafts] = useState<Record<string, DraftRate>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchBusinessAnalyticsSettings()
      .then((settings) => setDefaultRate(settings.trainerSettlementRate))
      .catch(() => setDefaultRate(50))
  }, [])

  useEffect(() => {
    setDrafts(Object.fromEntries(trainers.map((trainer) => [trainer.id, toDraft(trainer)])))
  }, [trainers])

  async function handleSave(trainer: Trainer) {
    const draft = drafts[trainer.id] ?? toDraft(trainer)
    setSavingId(trainer.id)
    setError(null)
    setMessage(null)

    try {
      let nextRate: number | null = null
      if (!draft.useDefault) {
        const parsed = Number(draft.value)
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
          throw new Error('0~100 사이의 비율을 입력해 주세요.')
        }
        nextRate = Math.round(parsed)
      }

      await updateTrainerSettlementRate(trainer.id, nextRate)
      setMessage(`${trainer.name} 트레이너 수업료 비율이 저장되었습니다.`)
      onUpdated()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSavingId(null)
    }
  }

  if (trainers.length === 0) return null

  return (
    <section className={`${cardClass} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">트레이너 수업료 비율</h2>
          <p className="mt-1 text-sm text-muted">
            트레이너마다 다른 비율을 지정할 수 있습니다. 비우면 센터 기본값{' '}
            <span className="font-semibold text-charcoal">{defaultRate}%</span>이
            적용됩니다. 출석부·경영분석에 반영됩니다.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gold/25">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-2.5">트레이너</th>
              <th className="px-4 py-2.5">수업료 비율</th>
              <th className="px-4 py-2.5">적용</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/15">
            {trainers.map((trainer) => {
              const draft = drafts[trainer.id] ?? toDraft(trainer)

              return (
                <tr key={trainer.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">{trainer.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={draft.useDefault}
                        value={draft.value}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [trainer.id]: {
                              ...draft,
                              value: e.target.value,
                              useDefault: false,
                            },
                          }))
                        }
                        placeholder={String(defaultRate)}
                        className={`${inputClass} w-24`}
                      />
                      <span className="text-xs text-muted">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-xs text-charcoal">
                      <input
                        type="checkbox"
                        checked={draft.useDefault}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [trainer.id]: {
                              value: e.target.checked ? '' : draft.value,
                              useDefault: e.target.checked,
                            },
                          }))
                        }
                      />
                      기본값 ({defaultRate}%)
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={savingId === trainer.id}
                      onClick={() => void handleSave(trainer)}
                      className={`${btnOutline} px-3 py-1.5 text-xs`}
                    >
                      {savingId === trainer.id ? '저장 중…' : '저장'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {message && <p className="mt-3 text-sm font-medium text-gold-dark">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  )
}
