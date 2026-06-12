import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createExerciseJournal,
  deleteExerciseJournal,
  fetchExerciseJournals,
  updateExerciseJournal,
  type ExerciseJournal,
} from '../api/exerciseJournals'
import { formatDate } from '../api/members'
import { formatSupabaseError } from '../lib/errors'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../styles/theme'
import { ExerciseJournalPhotoGallery } from './member/ExerciseJournalPhotoGallery'
import { ExerciseJournalPhotoPicker } from './member/ExerciseJournalPhotoPicker'

const PLACEHOLDER = `예) 하체 데이
- 스쿼트 60kg 4×8
- 런지 12회×3
- 코어 플랭크 1분×3
- 다음: 무게 2.5kg 증량`

type Props = {
  memberId: string
}

export function MemberExerciseJournalSection({ memberId }: Props) {
  const [journals, setJournals] = useState<ExerciseJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trainedAt, setTrainedAt] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTrainedAt, setEditTrainedAt] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editExistingUrls, setEditExistingUrls] = useState<string[]>([])
  const [editPhotoFiles, setEditPhotoFiles] = useState<File[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchExerciseJournals(memberId)
      setJournals(data)
    } catch (err) {
      setError(formatSupabaseError(err))
      setJournals([])
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() && photoFiles.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await createExerciseJournal(memberId, {
        trained_at: trainedAt,
        title,
        content,
        photoFiles,
      })
      setTitle('')
      setContent('')
      setPhotoFiles([])
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(journal: ExerciseJournal) {
    setEditingId(journal.id)
    setEditTrainedAt(String(journal.trained_at).slice(0, 10))
    setEditTitle(journal.title ?? '')
    setEditContent(journal.content === '(사진 첨부)' ? '' : journal.content)
    setEditExistingUrls(journal.image_urls)
    setEditPhotoFiles([])
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTrainedAt('')
    setEditTitle('')
    setEditContent('')
    setEditExistingUrls([])
    setEditPhotoFiles([])
  }

  async function handleUpdate(journalId: string) {
    if (!editContent.trim() && editExistingUrls.length + editPhotoFiles.length === 0) {
      return
    }
    setUpdatingId(journalId)
    setError(null)
    try {
      await updateExerciseJournal(memberId, journalId, {
        trained_at: editTrainedAt,
        title: editTitle,
        content: editContent,
        existingImageUrls: editExistingUrls,
        photoFiles: editPhotoFiles,
      })
      cancelEdit()
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(journalId: string) {
    if (!window.confirm('이 운동일지를 삭제할까요?')) return
    setDeletingId(journalId)
    setError(null)
    try {
      await deleteExerciseJournal(journalId)
      if (editingId === journalId) cancelEdit()
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
        <h3 className="text-base font-semibold text-charcoal">운동일지</h3>
        <p className="mt-0.5 text-xs text-muted">
          트레이너·관리자가 작성한 내용이 회원 페이지에 표시됩니다.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="border-b border-gold/20 px-5 py-4 sm:px-6"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0 text-sm">
            <span className="mb-1 block font-medium text-charcoal/70">
              운동일
            </span>
            <input
              type="date"
              value={trainedAt}
              onChange={(e) => setTrainedAt(e.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="block min-w-0 text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-charcoal/70">
              제목 (선택)
            </span>
            <input
              type="text"
              lang="ko"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 하체 데이"
              className={inputClass}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-charcoal/70">내용</span>
          <textarea
            lang="ko"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder={PLACEHOLDER}
            className={`${inputClass} resize-y text-sm leading-relaxed`}
          />
        </label>
        <div className="mt-3">
          <ExerciseJournalPhotoPicker
            files={photoFiles}
            onChange={setPhotoFiles}
            disabled={saving}
          />
        </div>
        <button
          type="submit"
          disabled={saving || (!content.trim() && photoFiles.length === 0)}
          className={`mt-3 ${btnPrimary}`}
        >
          {saving ? '저장 중…' : '운동일지 등록'}
        </button>
      </form>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-6">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-6 py-10 text-center text-sm text-muted">불러오는 중…</p>
      ) : journals.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">
          등록된 운동일지가 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-gold/15">
          {journals.map((j) => {
            const isEditing = editingId === j.id
            return (
              <li key={j.id} className="px-5 py-4 sm:px-6">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="date"
                        value={editTrainedAt}
                        onChange={(e) => setEditTrainedAt(e.target.value)}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        lang="ko"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="제목"
                        className={inputClass}
                      />
                    </div>
                    <textarea
                      lang="ko"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      className={`${inputClass} resize-y text-sm leading-relaxed`}
                    />
                    {editExistingUrls.length > 0 && (
                      <ExerciseJournalPhotoGallery urls={editExistingUrls} />
                    )}
                    <ExerciseJournalPhotoPicker
                      files={editPhotoFiles}
                      onChange={setEditPhotoFiles}
                      disabled={updatingId === j.id}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          updatingId === j.id ||
                          (!editContent.trim() &&
                            editExistingUrls.length + editPhotoFiles.length === 0)
                        }
                        onClick={() => void handleUpdate(j.id)}
                        className={btnPrimary}
                      >
                        {updatingId === j.id ? '저장 중…' : '저장'}
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
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="rounded bg-gold/20 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-charcoal tabular-nums">
                          {formatDate(j.trained_at)}
                        </span>
                        {j.title && (
                          <span className="truncate text-sm font-semibold text-charcoal">
                            {j.title}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(j)}
                          className="btn-ghost"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(j.id)}
                          disabled={deletingId === j.id}
                          className="btn-ghost text-red-600"
                        >
                          {deletingId === j.id ? '…' : '삭제'}
                        </button>
                      </div>
                    </div>
                    {j.content !== '(사진 첨부)' && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal/85">
                        {j.content}
                      </p>
                    )}
                    <ExerciseJournalPhotoGallery urls={j.image_urls} />
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
