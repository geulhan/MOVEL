import { useCallback, useEffect, useState } from 'react'
import {
  fetchPlatformFeedback,
  updatePlatformFeedbackStatus,
} from '../../api/platformFeedback'
import type {
  PlatformFeedbackItem,
  PlatformFeedbackStatus,
  PlatformFeedbackType,
} from '../../types/platformOps'
import {
  PLATFORM_FEEDBACK_STATUS_LABELS,
  PLATFORM_FEEDBACK_TYPE_LABELS,
} from '../../types/platformOps'
import { btnOutline } from '../../styles/theme'

const TYPE_FILTERS: Array<{ id: PlatformFeedbackType | 'all'; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'bug', label: '버그' },
  { id: 'feature', label: '기능요청' },
  { id: 'improvement', label: '개선요청' },
  { id: 'question', label: '문의' },
]

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export default function PlatformFeedbackPage() {
  const [items, setItems] = useState<PlatformFeedbackItem[]>([])
  const [typeFilter, setTypeFilter] = useState<PlatformFeedbackType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(
        await fetchPlatformFeedback(
          typeFilter === 'all' ? undefined : { type: typeFilter },
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '피드백을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function handleStatusChange(id: string, status: PlatformFeedbackStatus) {
    setUpdatingId(id)
    try {
      await updatePlatformFeedbackStatus(id, status)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 실패')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">피드백</h1>
        <p className="mt-1 text-sm text-cream/60">센터·회원이 보낸 의견을 검토합니다.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTypeFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              typeFilter === f.id ? 'bg-white/10 text-white' : 'text-cream/60 hover:text-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-cream/60">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-cream/60">피드백이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-white/10 bg-[#161d26] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-cream/50">
                    {item.center_name} · {PLATFORM_FEEDBACK_TYPE_LABELS[item.type]} · {formatWhen(item.created_at)}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-cream/75">{item.content}</p>
                  <p className="mt-2 text-xs text-cream/45">작성: {item.created_by} ({item.created_by_type})</p>
                </div>
                <select
                  value={item.status}
                  disabled={updatingId === item.id}
                  onChange={(e) =>
                    void handleStatusChange(item.id, e.target.value as PlatformFeedbackStatus)
                  }
                  className="rounded-lg border border-white/15 bg-[#0f1419] px-2 py-1.5 text-xs text-cream"
                >
                  {(Object.keys(PLATFORM_FEEDBACK_STATUS_LABELS) as PlatformFeedbackStatus[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {PLATFORM_FEEDBACK_STATUS_LABELS[s]}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}

      <button type="button" onClick={() => void load()} className={btnOutline}>
        새로고침
      </button>
    </div>
  )
}
