import { useCallback, useEffect, useState } from 'react'
import { fetchExerciseJournals, type ExerciseJournal } from '../../api/exerciseJournals'
import { formatDate } from '../../api/members'
import { formatSupabaseError } from '../../lib/errors'
import { cardClass } from '../../styles/theme'
import { MemberInbodySection } from './MemberInbodySection'

type Props = {
  memberId: string
}

export function MemberJournalPortalSection({ memberId }: Props) {
  const [journals, setJournals] = useState<ExerciseJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-4">
      <MemberInbodySection memberId={memberId} createdBy="member" />

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-gold/20 px-4 py-4">
          <h3 className="font-semibold text-charcoal">운동일지</h3>
          <p className="mt-1 text-xs text-muted">
            트레이너가 작성한 운동 기록입니다.
          </p>
        </div>

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
            {journals.map((journal) => (
              <li key={journal.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-gold/20 px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums">
                    {formatDate(journal.trained_at)}
                  </span>
                  {journal.title && (
                    <span className="text-sm font-semibold text-charcoal">
                      {journal.title}
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal/85">
                  {journal.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
