import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createExerciseJournal,
  deleteExerciseJournal,
  fetchExerciseJournals,
  type ExerciseJournal,
} from '../../api/exerciseJournals'
import { formatDate } from '../../api/members'
import { formatSupabaseError } from '../../lib/errors'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import { ExerciseJournalPhotoGallery } from './ExerciseJournalPhotoGallery'
import { ExerciseJournalPhotoPicker } from './ExerciseJournalPhotoPicker'
type Props = {
  memberId: string
}

const PLACEHOLDER = `오늘 운동 내용을 적어 주세요.
예) 가슴·삼두 60분, 벤치프레스 50kg`

export function MemberJournalPortalSection({ memberId }: Props) {
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setJournals(await fetchExerciseJournals(memberId))
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() && photoFiles.length === 0) {
      setError('내용 또는 사진을 입력해 주세요.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createExerciseJournal(memberId, {
        trained_at: trainedAt,
        title,
        content,
        created_by: 'member',
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

  async function handleDelete(journalId: string) {
    if (!window.confirm('이 운동일지를 삭제할까요?')) return
    setDeletingId(journalId)
    setError(null)
    try {
      await deleteExerciseJournal(journalId)
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-gold/20 px-4 py-4">
          <h3 className="font-semibold text-charcoal">운동일지</h3>
          <p className="mt-1 text-xs text-muted">
            운동 기록과 사진을 남길 수 있습니다. 트레이너가 작성한 일지도 함께
            표시됩니다.
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-3 border-b border-gold/20 p-4"
        >
          <p className="text-sm font-semibold text-charcoal">기록 작성</p>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">운동일</span>
            <input
              type="date"
              value={trainedAt}
              onChange={(e) => setTrainedAt(e.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">제목 (선택)</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 상체 데이"
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">내용</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder={PLACEHOLDER}
              className={`${inputClass} resize-y text-sm leading-relaxed`}
            />
          </label>
          <ExerciseJournalPhotoPicker
            files={photoFiles}
            onChange={setPhotoFiles}
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving}
            className={`w-full ${btnPrimary}`}
          >
            {saving ? '저장 중…' : '운동일지 저장'}
          </button>
        </form>

        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            불러오는 중…
          </p>
        ) : journals.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            아직 등록된 운동일지가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-gold/15">
            {journals.map((journal) => {
              const isOwn = journal.created_by === 'member'
              return (
                <li key={journal.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-gold/20 px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums">
                        {formatDate(journal.trained_at)}
                      </span>
                      {journal.title && (
                        <span className="text-sm font-semibold text-charcoal">
                          {journal.title}
                        </span>
                      )}
                      <span className="text-[10px] text-muted">
                        {isOwn ? '내 기록' : '트레이너'}
                      </span>
                    </div>
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(journal.id)}
                        disabled={deletingId === journal.id}
                        className={btnOutline}
                      >
                        {deletingId === journal.id ? '…' : '삭제'}
                      </button>
                    )}
                  </div>
                  {journal.content !== '(사진 첨부)' && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal/85">
                      {journal.content}
                    </p>
                  )}
                  <ExerciseJournalPhotoGallery urls={journal.image_urls} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
  )
}
