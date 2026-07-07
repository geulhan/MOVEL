import type { RenewalRiskMember } from '../../api/kpi'
import type { CenterAttendanceRow } from '../../api/attendance'
import type { PaymentRequestWithMember } from '../../api/paymentRequests'
import type { ConsultationLead } from '../../types/leads'
import type { Member } from '../../types/database'

export type ActionFeedContext = {
  today: string
  members: Member[]
  leads: ConsultationLead[]
  attendanceRows: CenterAttendanceRow[]
  pendingPayments: PaymentRequestWithMember[]
  renewalRisk: RenewalRiskMember[]
  classTodayCount: number
  classReservationCount: number
  lastAttendanceByMember: Map<string, string>
  lastScheduleByMember: Map<string, string>
  completedSessionsByMember: Map<string, number>
  reviewRequestedMemberIds: Set<string>
  trainerMemberIds: Set<string> | null
}
