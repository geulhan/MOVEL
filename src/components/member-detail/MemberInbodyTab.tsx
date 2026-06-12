import { MemberInbodySection } from '../member/MemberInbodySection'
import { getAdminSession } from '../../lib/adminSession'
import { isFullAdmin } from '../../lib/adminPermissions'
import { useMemberDetail } from './MemberDetailContext'

export function MemberInbodyTab() {
  const { memberId } = useMemberDetail()
  const session = getAdminSession()
  const createdBy = isFullAdmin(session) ? 'admin' : 'trainer'

  return (
    <MemberInbodySection
      memberId={memberId}
      createdBy={createdBy}
    />
  )
}
