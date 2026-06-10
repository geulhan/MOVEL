import { useState, type FormEvent } from 'react'
import { createTrainer } from '../api/trainers'
import { btnGold, cardClass, inputClass } from '../styles/theme'
import type { Trainer } from '../types/database'

type Props = {
  trainers: Trainer[]
  onUpdated: () => void
}

export function TrainerManage({ trainers, onUpdated }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      await createTrainer(name)
      setName('')
      setMessage('트레이너가 등록되었습니다.')
      onUpdated()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '트레이너 등록에 실패했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={`${cardClass} p-6`}>
      <h2 className="text-lg font-semibold text-charcoal">트레이너 관리</h2>
      <p className="mt-1 text-sm text-muted">
        등록된 트레이너를 회원 등록 시 선택할 수 있습니다.
      </p>

      {trainers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {trainers.map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-gold/40 bg-cream px-3 py-1 text-sm font-medium text-charcoal"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex-1">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            새 트레이너
          </span>
          <input
            type="text"
            lang="ko"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="트레이너 이름"
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={loading} className={btnGold}>
          {loading ? '등록 중…' : '트레이너 등록'}
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
