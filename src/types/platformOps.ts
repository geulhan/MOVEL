export type PlatformRankItem = {
  name: string
  slug: string
  value: number
}

export type PlatformDashboardSnapshot = {
  kpi: {
    total_centers: number
    active_centers: number
    beta_centers: number
    expired_centers: number
    total_members: number
    total_admins: number
    total_trainers: number
  }
  monthly: {
    new_centers: number
    new_members: number
    payment_count: number
    payment_revenue: number
    message_usage: number
  }
  rankings: {
    members: PlatformRankItem[]
    revenue: PlatformRankItem[]
    attendance: PlatformRankItem[]
    booking: PlatformRankItem[]
  }
  beta_alerts: {
    inactive_7d: BetaInactiveCenter[]
    inactive_14d: BetaInactiveCenter[]
  }
  recent_activity: PlatformActivityItem[]
}

export type BetaInactiveCenter = {
  id: string
  name: string
  slug: string
  last_activity_at: string
}

export type PlatformActivityItem = {
  id: string
  center_id: string
  center_name: string
  center_slug: string
  actor_type: string
  actor_id: string | null
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export type PlatformCenterDetail = {
  center: {
    id: string
    name: string
    slug: string
    status: string
    created_at: string
    service_starts_at: string | null
    service_ends_at: string | null
    service_period_ok: boolean
    beta_trial: boolean
    plan_code: string | null
    contact_email: string | null
    contact_phone: string | null
  }
  operations: {
    member_count: number
    active_members: number
    dormant_members: number
    trainer_count: number
    schedule_count: number
    attendance_rate: number
    noshow_rate: number
  }
  finance: {
    total_revenue: number
    month_revenue: number
    recognized_revenue: number
    prepaid_estimate: number
    refund_estimate: number
  }
  messaging: Record<string, unknown>
  messaging_usage: {
    month_total: number
    month_auto: number
    month_campaign: number
  }
  recent_activity: Array<{
    action: string
    actor_type: string
    metadata: Record<string, unknown>
    created_at: string
  }>
}

export type PlatformFeedbackType = 'bug' | 'feature' | 'improvement' | 'question'
export type PlatformFeedbackStatus = 'open' | 'reviewing' | 'planned' | 'completed'

export type PlatformFeedbackItem = {
  id: string
  center_id: string
  center_name: string
  center_slug: string
  created_by: string
  created_by_type: string
  type: PlatformFeedbackType
  title: string
  content: string
  status: PlatformFeedbackStatus
  created_at: string
}

export type PlatformAnalyticsSnapshot = {
  feature_totals: {
    member_manage: number
    schedule: number
    attendance: number
    journal: number
    message: number
    payment: number
    analytics: number
  }
  centers: Array<{
    id: string
    name: string
    slug: string
    member_manage: number
    schedule: number
    attendance: number
    journal: number
    message: number
    payment: number
    analytics: number
  }>
}

export type BetaCenterRow = {
  id: string
  name: string
  slug: string
  status: string
  service_starts_at: string | null
  service_ends_at: string | null
  days_remaining: number | null
  last_activity_at: string
}

export const PLATFORM_FEEDBACK_TYPE_LABELS: Record<PlatformFeedbackType, string> = {
  bug: '버그',
  feature: '기능요청',
  improvement: '개선요청',
  question: '문의',
}

export const PLATFORM_FEEDBACK_STATUS_LABELS: Record<PlatformFeedbackStatus, string> = {
  open: '접수',
  reviewing: '검토 중',
  planned: '예정',
  completed: '완료',
}

export const PLATFORM_ACTIVITY_LABELS: Record<string, string> = {
  login: '로그인',
  member_created: '회원 생성',
  schedule_created: '예약 생성',
  schedule_completed: '수업 완료',
  schedule_cancelled: '예약 취소',
  attendance_checkin: '출석 체크인',
  attendance_processed: '출석 처리',
  message_sent: '메시지 발송',
  payment_registered: '결제 등록',
  journal_created: '운동일지 작성',
  feedback_submitted: '피드백 제출',
  analytics_viewed: '경영분석 조회',
}
