import { MemberExerciseJournalSection } from '../MemberExerciseJournalSection'
import { useMemberDetail } from './MemberDetailContext'

export function MemberJournalTab() {
  const { memberId } = useMemberDetail()

  return <MemberExerciseJournalSection memberId={memberId} />
}
