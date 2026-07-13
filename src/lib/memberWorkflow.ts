import type { Member } from '../types/database'
import type { PaymentHistory } from '../types/database'
import type { MemberAttendanceRow } from '../api/attendance'
import { isRenewalTarget } from '../utils/renewal'

export type MemberWorkflowStepId =
  | 'registered'
  | 'payment'
  | 'schedule'
  | 'attendance'
  | 'records'
  | 'journal'
  | 'renewal'

export type MemberWorkflowStep = {
  id: MemberWorkflowStepId
  label: string
  done: boolean
  href: string
}

export function buildMemberWorkflowSteps(input: {
  memberId: string
  member: Member
  payments: PaymentHistory[]
  attendance: MemberAttendanceRow[]
  journalCount?: number
  features?: { pt?: boolean; attendance?: boolean; exercise_log?: boolean }
}): MemberWorkflowStep[] {
  const { memberId, member, payments, attendance, journalCount = 0, features } = input
  const base = `/admin/member/${memberId}`
  const hasPt = member.total_sessions > 0 || payments.length > 0
  const hasAttendance = attendance.length > 0

  const steps: MemberWorkflowStep[] = [
    {
      id: 'registered',
      label: '회원 등록',
      done: true,
      href: base,
    },
  ]

  if (features?.pt !== false) {
    steps.push({
      id: 'payment',
      label: '결제·PT',
      done: hasPt,
      href: `${base}/pt`,
    })
    steps.push({
      id: 'schedule',
      label: '예약',
      done: hasAttendance || member.remaining_sessions < member.total_sessions,
      href: `/admin/reservations?memberId=${memberId}`,
    })
  }

  if (features?.attendance !== false) {
    steps.push({
      id: 'attendance',
      label: '출석',
      done: hasAttendance,
      href: `/admin/attendance?memberId=${memberId}`,
    })
  }

  steps.push({
    id: 'records',
    label: '기록',
    done: false,
    href: `${base}/records`,
  })

  if (features?.exercise_log !== false) {
    steps.push({
      id: 'journal',
      label: '운동일지',
      done: journalCount > 0,
      href: `${base}/journal`,
    })
  }

  steps.push({
    id: 'renewal',
    label: '재등록',
    done: !isRenewalTarget(member) && member.remaining_sessions > 3,
    href: `${base}/pt`,
  })

  return steps
}
