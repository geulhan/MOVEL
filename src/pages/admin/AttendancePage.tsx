import { useSearchParams } from 'react-router-dom'
import { CenterAttendanceBoard } from '../../components/admin/CenterAttendanceBoard'

export default function AttendancePage() {
  const [searchParams] = useSearchParams()
  const highlightMemberId = searchParams.get('memberId') ?? undefined

  return <CenterAttendanceBoard highlightMemberId={highlightMemberId} />
}
