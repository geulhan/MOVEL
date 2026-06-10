import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createMemo,
  deleteMemo,
  fetchMemos,
  updateMemo,
} from '../api/memberDetail'
import { formatSupabaseError } from '../lib/errors'
import type { MemberMemo } from '../types/database'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../styles/theme'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  memberId: string
}

export function MemberAdminMemosSection({ memberId }: Props) {
  const [memos, setMemos] = useState<MemberMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMemos(memberId)
      setMemos(data)
    } catch (err) {
      setError(formatSupabaseError(err))
      setMemos([])
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!newContent.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createMemo(memberId, newContent)
      setNewContent('')
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(memo: MemberMemo) {
    setEditingId(memo.id)
    setEditContent(memo.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  async function handleUpdate(memoId: string) {
    if (!editContent.trim()) return
    setUpdatingId(memoId)
    setError(null)
    try {
      await updateMemo(memoId, editContent)
      cancelEdit()
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(memoId: string) {
    if (!window.confirm('이 메모를 삭제할까요?')) return
    setDeletingId(memoId)
    setError(null)
    try {
      await deleteMemo(memoId)
      if (editingId === memoId) cancelEdit()
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="card-header">
        <h3 className="text-base font-semibold text-charcoal">관리자 메모</h3>
        <p className="mt-0.5 text-xs text-muted">
          내부 관리용 메모 · 회원에게는 표시되지 않습니다.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="border-b border-gold/20 px-5 py-4 sm:px-6"
      >
        <textarea
          lang="ko"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          placeholder="회원 관리 메모를 입력하세요"
          className={`${inputClass} resize-y text-sm`}
        />
        <button
          type="submit"
          disabled={saving || !newContent.trim()}
          className={`mt-3 ${btnPrimary}`}
        >
          {saving ? '저장 중…' : '메모 추가'}
        </button>
      </form>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-6">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-6 py-10 text-center text-sm text-muted">불러오는 중…</p>
      ) : memos.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">
          등록된 메모가 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-gold/15">
          {memos.map((m) => {
            const isEditing = editingId === m.id
            return (
              <li key={m.id} className="px-5 py-4 sm:px-6">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      lang="ko"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-y text-sm`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={updatingId === m.id || !editContent.trim()}
                        onClick={() => void handleUpdate(m.id)}
                        className={btnPrimary}
                      >
                        {updatingId === m.id ? '저장 중…' : '저장'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className={btnOutline}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
                      {m.content}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <time
                        dateTime={m.created_at}
                        className="text-xs text-charcoal/40 tabular-nums"
                      >
                        {formatDateTime(m.created_at)}
                        {m.updated_at !== m.created_at && ' (수정됨)'}
                      </time>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="btn-ghost"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(m.id)}
                          disabled={deletingId === m.id}
                          className="btn-ghost text-red-600"
                        >
                          {deletingId === m.id ? '…' : '삭제'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
