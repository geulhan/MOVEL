import { MemberExerciseJournalSection } from '../MemberExerciseJournalSection'
import { useMemberDetail } from './MemberDetailContext'

export function MemberJournalTab() {
  const { memberId, member } = useMemberDetail()

  return (
    <MemberExerciseJournalSection
      memberId={memberId}
      memberName={member?.name ?? '회원'}
    />
  )
}
