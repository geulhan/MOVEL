export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'

export type ActionType =
  | 'renewal_message'
  | 'lead_contact'
  | 'lead_followup'
  | 'pt_checkin'
  | 'class_checkin'
  | 'payment_complete'
  | 'review_request'
  | 'dormant_outreach'
  | 'birthday_coupon'

export type FeedActionExecuteKind = 'send_renewal' | 'navigate'

/** Action Engine이 생성하는 JSON-serializable 액션 객체 */
export type FeedAction = {
  id: string
  priority: ActionPriority
  type: ActionType
  title: string
  reason: string
  deadline: string | null
  deadlineLabel: string
  nextAction: string
  execute: FeedActionExecuteKind
  href?: string
  memberId?: string
  leadId?: string
  requestId?: string
  count?: number
  successRate?: number
  meta?: string
}

export type ActionFeedSnapshot = {
  dateLabel: string
  actions: FeedAction[]
  generatedAt: string
}
