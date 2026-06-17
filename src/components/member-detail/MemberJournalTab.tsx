import { useSearchParams } from 'react-router-dom'
import { MemberExerciseJournalSection } from '../MemberExerciseJournalSection'
import { useMemberDetail } from './MemberDetailContext'

export function MemberJournalTab() {
  const { memberId, member } = useMemberDetail()
  const [searchParams] = useSearchParams()
  const initialTrainedAt = searchParams.get('date') ?? undefined

  return (
    <MemberExerciseJournalSection
      memberId={memberId}
      memberName={member?.name ?? '회원'}
      initialTrainedAt={initialTrainedAt}
    />
  )
}
