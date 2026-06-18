import { useEffect, useState } from 'react'
import { fetchBusinessAnalyticsSettings } from '../../api/businessAnalyticsSettings'
import { updateTrainerSettlement } from '../../api/trainers'
import { formatSupabaseError } from '../../lib/errors'
import { btnOutline, cardClass, inputClass } from '../../styles/theme'
import type { Trainer, TrainerSettlementMode } from '../../types/database'

type Props = {
  trainers: Trainer[]
  onUpdated: () => void
}

type DraftSettlement = {
  mode: TrainerSettlementMode
  useDefault: boolean
  percentValue: string
  fixedValue: string
}

function toDraft(trainer: Trainer): DraftSettlement {
  if (trainer.settlement_mode === 'fixed') {
    return {
      mode: 'fixed',
      useDefault: false,
      percentValue: '',
      fixedValue:
        trainer.settlement_fixed_amount == null
          ? ''
          : String(trainer.settlement_fixed_amount),
    }
  }
  if (trainer.settlement_rate == null) {
    return {
      mode: 'percent',
      useDefault: true,
      percentValue: '',
      fixedValue: '',
    }
  }
  return {
    mode: 'percent',
    useDefault: false,
    percentValue: String(trainer.settlement_rate),
    fixedValue: '',
  }
}

export function TrainerSettlementPanel({ trainers, onUpdated }: Props) {
  const [defaultRate, setDefaultRate] = useState(50)
  const [drafts, setDrafts] = useState<Record<string, DraftSettlement>>({})
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
      if (draft.mode === 'percent') {
        let nextRate: number | null = null
        if (!draft.useDefault) {
          const parsed = Number(draft.percentValue)
          if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
            throw new Error('0~100 사이의 비율을 입력해 주세요.')
          }
          nextRate = Math.round(parsed)
        }
        await updateTrainerSettlement(trainer.id, {
          mode: 'percent',
          settlementRate: nextRate,
          settlementFixedAmount: null,
        })
      } else {
        const parsed = Number(draft.fixedValue)
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error('0원 이상의 고정 금액을 입력해 주세요.')
        }
        await updateTrainerSettlement(trainer.id, {
          mode: 'fixed',
          settlementRate: null,
          settlementFixedAmount: Math.round(parsed),
        })
      }

      setMessage(`${trainer.name} 강사 수업료 설정이 저장되었습니다.`)
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
          <h2 className="text-lg font-semibold text-charcoal">강사 수업료 설정</h2>
          <p className="mt-1 text-sm text-muted">
            비율(%) 또는 고정 금액(원/회)으로 설정할 수 있습니다. 비율을 비우면 센터
            기본값 <span className="font-semibold text-charcoal">{defaultRate}%</span>이
            적용됩니다. PT 출석·그룹수업 진행 건수에 반영됩니다.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gold/25">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-2.5">강사</th>
              <th className="px-4 py-2.5">정산 방식</th>
              <th className="px-4 py-2.5">수업료</th>
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
                    <div className="flex flex-col gap-1.5 text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`mode-${trainer.id}`}
                          checked={draft.mode === 'percent'}
                          onChange={() =>
                            setDrafts((prev) => ({
                              ...prev,
                              [trainer.id]: { ...draft, mode: 'percent' },
                            }))
                          }
                        />
                        비율 (%)
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`mode-${trainer.id}`}
                          checked={draft.mode === 'fixed'}
                          onChange={() =>
                            setDrafts((prev) => ({
                              ...prev,
                              [trainer.id]: {
                                ...draft,
                                mode: 'fixed',
                                useDefault: false,
                              },
                            }))
                          }
                        />
                        고정 금액 (원/회)
                      </label>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {draft.mode === 'percent' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={draft.useDefault}
                            value={draft.percentValue}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [trainer.id]: {
                                  ...draft,
                                  percentValue: e.target.value,
                                  useDefault: false,
                                },
                              }))
                            }
                            placeholder={String(defaultRate)}
                            className={`${inputClass} w-24`}
                          />
                          <span className="text-xs text-muted">%</span>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-charcoal">
                          <input
                            type="checkbox"
                            checked={draft.useDefault}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [trainer.id]: {
                                  ...draft,
                                  percentValue: e.target.checked ? '' : draft.percentValue,
                                  useDefault: e.target.checked,
                                },
                              }))
                            }
                          />
                          기본값 ({defaultRate}%)
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={draft.fixedValue}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [trainer.id]: {
                                ...draft,
                                fixedValue: e.target.value,
                              },
                            }))
                          }
                          placeholder="30000"
                          className={`${inputClass} w-28`}
                        />
                        <span className="text-xs text-muted">원/회</span>
                      </div>
                    )}
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
