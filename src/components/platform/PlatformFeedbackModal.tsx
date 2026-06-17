import { useState, type FormEvent } from 'react'
import { submitPlatformFeedback } from '../../api/platformFeedback'
import type { PlatformFeedbackType } from '../../types/platformOps'
import { PLATFORM_FEEDBACK_TYPE_LABELS } from '../../types/platformOps'
import { btnGold, btnOutline, inputClass } from '../../styles/theme'

type Props = {
  open: boolean
  onClose: () => void
  centerId: string
  createdBy: string
  createdByType: 'admin' | 'trainer' | 'member'
}

export function PlatformFeedbackModal({
  open,
  onClose,
  centerId,
  createdBy,
  createdByType,
}: Props) {
  const [type, setType] = useState<PlatformFeedbackType>('improvement')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해 주세요.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await submitPlatformFeedback({
        centerId,
        createdBy,
        createdByType,
        type,
        title,
        content,
      })
      setDone(true)
      setTitle('')
      setContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '전송에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setDone(false)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl border border-gold/30 bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-gold/20 px-5 py-4">
          <h3 className="text-lg font-bold text-charcoal">의견 보내기</h3>
          <p className="mt-1 text-sm text-muted">MotionHub 플랫폼 팀에 전달됩니다.</p>
        </div>
        {done ? (
          <div className="space-y-4 px-5 py-6">
            <p className="text-sm text-charcoal">소중한 의견 감사합니다. 검토 후 반영하겠습니다.</p>
            <button type="button" onClick={handleClose} className={`w-full ${btnGold}`}>
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">유형</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PlatformFeedbackType)}
                  className={inputClass}
                  disabled={saving}
                >
                  {(Object.keys(PLATFORM_FEEDBACK_TYPE_LABELS) as PlatformFeedbackType[]).map(
                    (t) => (
                      <option key={t} value={t}>
                        {PLATFORM_FEEDBACK_TYPE_LABELS[t]}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">제목</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  disabled={saving}
                  maxLength={120}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-charcoal/70">내용</span>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`${inputClass} resize-y`}
                  disabled={saving}
                />
              </label>
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>
            <div className="flex gap-2 border-t border-gold/20 px-5 py-4">
              <button type="button" onClick={handleClose} disabled={saving} className={`flex-1 ${btnOutline}`}>
                취소
              </button>
              <button type="submit" disabled={saving} className={`flex-1 ${btnGold}`}>
                {saving ? '전송 중…' : '보내기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
