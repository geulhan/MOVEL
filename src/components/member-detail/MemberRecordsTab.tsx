import { MemberAdminMemosSection } from '../MemberAdminMemosSection'
import { MemberConsultationTimeline } from '../MemberConsultationTimeline'
import { useMemberDetail } from './MemberDetailContext'

export function MemberRecordsTab() {
  const { memberId } = useMemberDetail()

  return (
    <div className="space-y-5">
      <MemberAdminMemosSection memberId={memberId} />
      <MemberConsultationTimeline memberId={memberId} />
    </div>
  )
}
