import { useNavigate, useParams } from 'react-router-dom'
import { MemberDetailPage } from '../../components/MemberDetailPage'

export default function MemberDetailRoute() {
  const { memberId } = useParams<{ memberId: string }>()
  const navigate = useNavigate()

  if (!memberId) {
    return (
      <p className="text-sm text-charcoal/60">회원을 찾을 수 없습니다.</p>
    )
  }

  return (
    <MemberDetailPage
      memberId={memberId}
      onBack={() => navigate('/admin/members')}
    />
  )
}
