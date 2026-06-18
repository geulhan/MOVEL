import { useState, type FormEvent } from 'react'
import { createTrainer, deleteTrainer } from '../api/trainers'
import { btnGold, btnOutline, cardClass, inputClass } from '../styles/theme'
import type { Trainer } from '../types/database'

type Props = {
  trainers: Trainer[]
  onUpdated: () => void
}

export function TrainerManage({ trainers, onUpdated }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleDelete(trainer: Trainer) {
    if (
      !window.confirm(
        `${trainer.name} 강사를 삭제할까요?\n로그인 계정이 있으면 함께 삭제되며, 기존 회원 담당 정보는 유지됩니다.`,
      )
    ) {
      return
    }

    setDeletingId(trainer.id)
    setError(null)
    setMessage(null)
    try {
      await deleteTrainer(trainer.id)
      setMessage(`${trainer.name} 강사가 삭제되었습니다.`)
      onUpdated()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '강사 삭제에 실패했습니다.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      await createTrainer(name)
      setName('')
      setMessage('강사가 등록되었습니다.')
      onUpdated()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '강사 등록에 실패했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={`${cardClass} p-6`}>
      <h2 className="text-lg font-semibold text-charcoal">강사 등록</h2>
      <p className="mt-1 text-sm text-muted">
        등록된 강사를 회원·클래스 담당으로 지정할 수 있습니다.
      </p>

      {trainers.length > 0 && (
        <ul className="mt-4 divide-y divide-gold/15 rounded-xl border border-gold/25 bg-cream/40">
          {trainers.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="text-sm font-medium text-charcoal">{t.name}</span>
              <button
                type="button"
                disabled={deletingId === t.id}
                onClick={() => void handleDelete(t)}
                className={`${btnOutline} px-3 py-1.5 text-xs text-red-700`}
              >
                {deletingId === t.id ? '삭제 중…' : '삭제'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex-1">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            새 강사
          </span>
          <input
            type="text"
            lang="ko"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="강사 이름"
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={loading} className={btnGold}>
          {loading ? '등록 중…' : '강사 등록'}
        </button>
      </form>

      {message && (
        <p className="mt-2 text-sm font-medium text-gold-dark">{message}</p>
      )}
      {error && (
        <p className="mt-2 text-sm font-medium text-red-700">{error}</p>
      )}
    </section>
  )
}
