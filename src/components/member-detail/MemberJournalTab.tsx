import { useSearchParams } from 'react-router-dom'
import { MemberExerciseJournalSection } from '../MemberExerciseJournalSection'
import { PageHelpButton } from '../admin/PageHelpButton'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import { useMemberDetail } from './MemberDetailContext'

export function MemberJournalTab() {
  const { memberId, member } = useMemberDetail()
  const [searchParams] = useSearchParams()
  const initialTrainedAt = searchParams.get('date') ?? undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-charcoal">운동일지</h3>
        <PageHelpButton text={PAGE_HELP.journal} />
      </div>
      <MemberExerciseJournalSection
      memberId={memberId}
      memberName={member?.name ?? '회원'}
      initialTrainedAt={initialTrainedAt}
    />
    </div>
  )
}
