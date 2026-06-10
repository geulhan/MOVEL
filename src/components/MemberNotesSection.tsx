import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createMemberNote,
  deleteMemberNote,
  fetchMemberNotes,
  updateMemberNote,
} from '../api/memberNotes'
import { formatSupabaseError } from '../lib/errors'
import type { MemberNote } from '../types/database'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../styles/theme'

const PLACEHOLDER = `- 허리 통증
- 좌측 무릎 불편
- 수면 부족
- 체중 감량 목표`

function formatNoteDate(iso: string): string {
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

export function MemberNotesSection({ memberId }: Props) {
  const [notes, setNotes] = useState<MemberNote[]>([])
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
      const data = await fetchMemberNotes(memberId)
      setNotes(data)
    } catch (err) {
      setError(formatSupabaseError(err))
      setNotes([])
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
      await createMemberNote(memberId, newContent)
      setNewContent('')
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(note: MemberNote) {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  async function handleUpdate(noteId: string) {
    if (!editContent.trim()) return
    setUpdatingId(noteId)
    setError(null)
    try {
      await updateMemberNote(noteId, editContent)
      cancelEdit()
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(noteId: string) {
    if (!window.confirm('이 상담 기록을 삭제할까요?')) return
    setDeletingId(noteId)
    setError(null)
    try {
      await deleteMemberNote(noteId)
      if (editingId === noteId) cancelEdit()
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
        <h3 className="text-base font-semibold text-charcoal">상담 기록</h3>
        <p className="mt-0.5 text-xs text-muted">
          통증 이력·상담 내용·특이사항을 기록합니다. 작성일은 자동 저장됩니다.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="border-b border-gold/20 px-5 py-4 sm:px-6"
      >
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-charcoal/70">
            상담 내용
          </span>
          <textarea
            lang="ko"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={5}
            placeholder={PLACEHOLDER}
            className={`${inputClass} resize-y text-sm leading-relaxed`}
          />
        </label>
        <button
          type="submit"
          disabled={saving || !newContent.trim()}
          className={`mt-3 ${btnPrimary}`}
        >
          {saving ? '저장 중…' : '상담 기록 추가'}
        </button>
      </form>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-6">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-6 py-10 text-center text-sm text-muted">불러오는 중…</p>
      ) : notes.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">
          등록된 상담 기록이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-gold/15">
          {notes.map((note) => {
            const isEditing = editingId === note.id
            return (
              <li key={note.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <time
                    dateTime={note.created_at}
                    className="text-xs font-medium whitespace-nowrap text-charcoal/45 tabular-nums"
                  >
                    {formatNoteDate(note.created_at)}
                  </time>
                  {!isEditing && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        className="btn-ghost"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        className="btn-ghost text-red-600 hover:text-red-700"
                      >
                        {deletingId === note.id ? '…' : '삭제'}
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      lang="ko"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={5}
                      className={`${inputClass} resize-y text-sm leading-relaxed`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={updatingId === note.id || !editContent.trim()}
                        onClick={() => void handleUpdate(note.id)}
                        className={btnPrimary}
                      >
                        {updatingId === note.id ? '저장 중…' : '저장'}
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
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
                    {note.content}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
