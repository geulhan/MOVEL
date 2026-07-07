import { isLeadContactDueToday } from '../../api/leads'
import type { FeedAction, ActionPriority } from '../../types/actionEngine'
import type { ActionFeedContext } from './context'
import {
  PRIORITY_RANK,
  daysSinceDate,
  deadlineLabelForPriority,
  formatElapsedHours,
  renewalSuccessRate,
} from './helpers'

const ACTIVE_LEAD_STATUSES = new Set([
  'new',
  'contacted',
  'trial_scheduled',
  'trial_done',
  'pending_register',
])

function sortActions(actions: FeedAction[]): FeedAction[] {
  return [...actions].sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (rank !== 0) return rank
    if (a.deadline && b.deadline && a.deadline !== b.deadline) {
      return a.deadline.localeCompare(b.deadline)
    }
    return a.title.localeCompare(b.title, 'ko')
  })
}

function leadName(lead: ActionFeedContext['leads'][number]): string {
  return lead.legal_name?.trim() || lead.display_label?.trim() || lead.display_name || '상담 리드'
}

function memberInScope(
  memberId: string,
  trainerMemberIds: Set<string> | null,
): boolean {
  if (!trainerMemberIds) return true
  return trainerMemberIds.has(memberId)
}

function buildRenewalActions(ctx: ActionFeedContext): FeedAction[] {
  const actions: FeedAction[] = []

  for (const row of ctx.renewalRisk) {
    if (!memberInScope(row.member_id, ctx.trainerMemberIds)) continue

    const member = ctx.members.find((m) => m.id === row.member_id)
    if (!member || member.status === 'terminated') continue

    const daysSinceSchedule = daysSinceDate(
      ctx.lastScheduleByMember.get(member.id) ?? null,
    )

    const priority: ActionPriority =
      member.remaining_sessions <= 2 ? 'critical' : 'high'

    const successRate = renewalSuccessRate({
      member,
      lastAttendanceAt: row.last_attendance_at,
      daysSinceLastSchedule: daysSinceSchedule,
    })

    const scheduleHint =
      daysSinceSchedule == null
        ? '예약 없음'
        : daysSinceSchedule >= 7
          ? `${daysSinceSchedule}일 미예약`
          : '최근 예약 있음'

    actions.push({
      id: `renewal-${member.id}`,
      priority,
      type: 'renewal_message',
      title: member.name,
      reason: `잔여 PT ${member.remaining_sessions}회`,
      meta: scheduleHint,
      deadline: ctx.today,
      deadlineLabel: `${deadlineLabelForPriority(priority, ctx.today)} · 예상 성공률 ${successRate}%`,
      nextAction: '알림톡',
      execute: 'send_renewal',
      memberId: member.id,
      href: `/admin/member/${member.id}`,
      successRate,
    })
  }

  return actions.slice(0, 8)
}

function buildLeadContactActions(ctx: ActionFeedContext): FeedAction[] {
  const actions: FeedAction[] = []

  for (const lead of ctx.leads) {
    if (!ACTIVE_LEAD_STATUSES.has(lead.status)) continue
    if (!isLeadContactDueToday(lead)) continue

    const elapsed = formatElapsedHours(lead.last_activity_at)
    const isNew = lead.status === 'new'
    const priority: ActionPriority = isNew ? 'high' : 'medium'

    actions.push({
      id: `lead-contact-${lead.id}`,
      priority,
      type: 'lead_contact',
      title: leadName(lead),
      reason: isNew ? '신규 문의' : '오늘 연락 예정',
      meta: elapsed || undefined,
      deadline: lead.next_contact_at ?? ctx.today,
      deadlineLabel: deadlineLabelForPriority(priority, lead.next_contact_at),
      nextAction: '상담',
      execute: 'navigate',
      leadId: lead.id,
      href: `/admin/leads?leadId=${lead.id}`,
    })
  }

  return actions
}

function buildLeadFollowupActions(ctx: ActionFeedContext): FeedAction[] {
  const actions: FeedAction[] = []

  for (const lead of ctx.leads) {
    if (!ACTIVE_LEAD_STATUSES.has(lead.status)) continue
    if (isLeadContactDueToday(lead)) continue

    const days = daysSinceDate(lead.last_activity_at)
    if (days == null || days < 3) continue

    actions.push({
      id: `lead-followup-${lead.id}`,
      priority: days >= 7 ? 'high' : 'medium',
      type: 'lead_followup',
      title: leadName(lead),
      reason: '상담 후 팔로업 필요',
      meta: `${days}일 경과`,
      deadline: ctx.today,
      deadlineLabel: deadlineLabelForPriority('medium', ctx.today),
      nextAction: '상담',
      execute: 'navigate',
      leadId: lead.id,
      href: `/admin/leads?leadId=${lead.id}`,
    })
  }

  return actions.slice(0, 5)
}

function buildDormantActions(ctx: ActionFeedContext): FeedAction[] {
  const actions: FeedAction[] = []

  for (const member of ctx.members) {
    if (member.status !== 'active') continue
    if (member.remaining_sessions <= 0 && member.total_sessions > 0) continue
    if (!memberInScope(member.id, ctx.trainerMemberIds)) continue

    const lastSchedule = ctx.lastScheduleByMember.get(member.id)
    const lastAttendance = ctx.lastAttendanceByMember.get(member.id)
    const reference = lastSchedule ?? lastAttendance
    const gap = daysSinceDate(reference)
    if (gap == null || gap < 14) continue

    actions.push({
      id: `dormant-${member.id}`,
      priority: gap >= 21 ? 'high' : 'medium',
      type: 'dormant_outreach',
      title: member.name,
      reason: `${gap}일 예약·출석 없음`,
      meta: '휴면 위험',
      deadline: ctx.today,
      deadlineLabel: deadlineLabelForPriority('medium', ctx.today),
      nextAction: '연락',
      execute: 'navigate',
      memberId: member.id,
      href: `/admin/member/${member.id}`,
    })
  }

  return actions.slice(0, 5)
}

function buildPtCheckinActions(ctx: ActionFeedContext): FeedAction[] {
  const overdue = ctx.attendanceRows.filter(
    (row) =>
      row.displayStatus === 'absent' &&
      memberInScope(row.memberId, ctx.trainerMemberIds),
  )

  return overdue.map((row) => ({
    id: `pt-overdue-${row.memberId}-${row.scheduleId ?? 'walk'}`,
    priority: 'critical' as const,
    type: 'pt_checkin' as const,
    title: row.memberName,
    reason: '예약 시간 경과 · 출석 미처리',
    meta: row.scheduledAt ? formatElapsedHours(row.scheduledAt) : undefined,
    deadline: ctx.today,
    deadlineLabel: '즉시 처리',
    nextAction: '출석',
    execute: 'navigate' as const,
    memberId: row.memberId,
    href: `/admin/attendance?memberId=${row.memberId}`,
  }))
}

function buildBatchClassAction(ctx: ActionFeedContext): FeedAction | null {
  const pending = ctx.attendanceRows.filter(
    (row) =>
      row.displayStatus === 'scheduled' &&
      memberInScope(row.memberId, ctx.trainerMemberIds),
  )

  const displayCount = Math.max(
    pending.length,
    ctx.classReservationCount,
    ctx.classTodayCount,
  )

  if (displayCount <= 0) return null

  return {
    id: 'batch-class-today',
    priority: 'medium',
    type: 'class_checkin',
    title: '오늘 수업',
    reason: `${displayCount}건 출석·예약 대기`,
    deadline: ctx.today,
    deadlineLabel: '오늘까지',
    nextAction: '출석',
    execute: 'navigate',
    count: displayCount,
    href: '/admin/attendance',
  }
}

function buildBatchPaymentAction(ctx: ActionFeedContext): FeedAction | null {
  const scoped = ctx.pendingPayments.filter((request) =>
    memberInScope(request.member_id, ctx.trainerMemberIds),
  )
  if (scoped.length === 0) return null

  if (scoped.length === 1) {
    const request = scoped[0]
    const memberName = request.member?.name ?? '회원'
    return {
      id: `payment-${request.id}`,
      priority: 'high',
      type: 'payment_complete',
      title: memberName,
      reason: `결제 대기 ${Number(request.amount).toLocaleString('ko-KR')}원`,
      deadline: request.expires_at?.slice(0, 10) ?? ctx.today,
      deadlineLabel: deadlineLabelForPriority('high', ctx.today),
      nextAction: '결제',
      execute: 'navigate',
      memberId: request.member_id,
      requestId: request.id,
      href: `/admin/payments?requestId=${request.id}`,
    }
  }

  return {
    id: 'batch-payment-pending',
    priority: 'medium',
    type: 'payment_complete',
    title: '결제 대기',
    reason: `${scoped.length}건 미완료`,
    deadline: ctx.today,
    deadlineLabel: '오늘까지',
    nextAction: '결제',
    execute: 'navigate',
    count: scoped.length,
    href: '/admin/payments',
  }
}

function buildReviewBatchAction(ctx: ActionFeedContext): FeedAction | null {
  const eligible: string[] = []

  for (const member of ctx.members) {
    if (member.status !== 'active') continue
    if (!memberInScope(member.id, ctx.trainerMemberIds)) continue
    if (ctx.reviewRequestedMemberIds.has(member.id)) continue

    const completed = ctx.completedSessionsByMember.get(member.id) ?? 0
    const used = member.total_sessions - member.remaining_sessions
    const sessionsDone = Math.max(completed, used)
    if (sessionsDone < 1 || sessionsDone > 3) continue

    const lastAttendance = ctx.lastAttendanceByMember.get(member.id)
    const days = daysSinceDate(lastAttendance)
    if (days == null || days > 14) continue

    eligible.push(member.id)
  }

  if (eligible.length === 0) return null

  return {
    id: 'batch-review-request',
    priority: 'low',
    type: 'review_request',
    title: '후기 요청',
    reason: `${eligible.length}명 · 첫 수업 완료`,
    deadline: ctx.today,
    deadlineLabel: '이번 주',
    nextAction: '발송',
    execute: 'navigate',
    count: eligible.length,
    href: '/admin/motionhub',
  }
}

export function buildActionFeed(ctx: ActionFeedContext): FeedAction[] {
  const actions: FeedAction[] = [
    ...buildRenewalActions(ctx),
    ...buildPtCheckinActions(ctx),
    ...buildLeadContactActions(ctx),
    ...buildLeadFollowupActions(ctx),
    ...buildDormantActions(ctx),
  ]

  const batchClass = buildBatchClassAction(ctx)
  if (batchClass) actions.push(batchClass)

  const batchPayment = buildBatchPaymentAction(ctx)
  if (batchPayment) actions.push(batchPayment)

  const batchReview = buildReviewBatchAction(ctx)
  if (batchReview) actions.push(batchReview)

  return sortActions(actions)
}

export function feedActionToJson(action: FeedAction) {
  return {
    priority: action.priority,
    title: action.title,
    reason: action.reason,
    action: action.type,
    deadline: action.deadline,
    nextAction: action.nextAction,
    memberId: action.memberId,
    leadId: action.leadId,
    requestId: action.requestId,
    count: action.count,
    successRate: action.successRate,
  }
}
