/**
 * 메시지센터 도메인 타입 (설계용)
 * @see docs/message-center-architecture.md
 *
 * 현재 단계: 자동발송만 운영. 아래 타입은 향후 UI/API 구현 시 사용.
 */

export const DISPATCH_TYPES = [
  'automatic',
  'announcement',
  'direct',
  'campaign',
] as const

export type DispatchType = (typeof DISPATCH_TYPES)[number]

export const CAMPAIGN_KINDS = [
  'automatic',
  'announcement',
  'direct',
  'crm',
] as const

export type CampaignKind = (typeof CAMPAIGN_KINDS)[number]

export const CAMPAIGN_STATUSES = [
  'active',
  'draft',
  'scheduled',
  'running',
  'completed',
  'cancelled',
] as const

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const NOTIFICATION_STATUSES = [
  'pending',
  'sent',
  'failed',
  'skipped',
] as const

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

export const ANNOUNCEMENT_SEGMENTS = [
  'all',
  'active',
  'pt',
  'pilates',
  'yoga',
  'gx',
] as const

export type AnnouncementSegment = (typeof ANNOUNCEMENT_SEGMENTS)[number]

export const AUTOMATIC_TRIGGER_EVENTS = [
  'member_welcome',
  'payment_completed',
  'membership_renewal',
  'pt_schedule_reminder',
  'pt_sessions_threshold',
  'membership_expiry',
  'class_schedule_reminder',
] as const

export type AutomaticTriggerEvent = (typeof AUTOMATIC_TRIGGER_EVENTS)[number]

export const CRM_RULE_TYPES = [
  'no_attendance_days',
  'membership_expires_within',
  'pt_sessions_lte',
  'birthday_today',
] as const

export type CrmRuleType = (typeof CRM_RULE_TYPES)[number]

export type MessageTemplate = {
  id: string
  centerId: string | null
  code: string
  name: string
  channelType: 'alimtalk' | 'sms' | 'lms'
  solapiTemplateId: string | null
  variablesSchema: Record<string, string>
  usageScope: DispatchType | 'all'
  isActive: boolean
}

export type AutomaticTriggerConfig = {
  event: AutomaticTriggerEvent
  offset_hours?: number
  window_hours?: number
  days_before?: number[]
  sessions_threshold?: number
  dedup_scope: string[]
}

export type AnnouncementAudienceConfig = {
  segments: AnnouncementSegment[]
  exclude_terminated?: boolean
}

export type CrmAudienceConfig = {
  rule_type: CrmRuleType
  days?: number
  sessions_lte?: number
}

export type MessageCampaign = {
  id: string
  centerId: string
  campaignKind: CampaignKind
  dispatchType: DispatchType
  name: string
  description: string | null
  templateId: string | null
  triggerConfig: AutomaticTriggerConfig | null
  audienceConfig: AnnouncementAudienceConfig | CrmAudienceConfig | null
  status: CampaignStatus
  isEnabled: boolean
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
}

export type NotificationHistory = {
  id: string
  centerId: string
  campaignId: string | null
  dispatchType: DispatchType
  batchId: string | null
  memberId: string | null
  phone: string
  templateId: string | null
  templateCode: string | null
  channel: 'alimtalk' | 'sms' | 'skipped' | null
  status: NotificationStatus
  providerMessageId: string | null
  errorMessage: string | null
  variables: Record<string, unknown>
  metadata: Record<string, unknown>
  creditsCharged: number
  dedupKey: string | null
  resendOfId: string | null
  messageLogId: string | null
  createdAt: string
  sentAt: string | null
}

/** 메시지센터 사이드바 (향후 라우트) */
export const MESSAGE_CENTER_NAV = [
  { to: '/admin/messages/automatic', label: '자동발송', implemented: true },
  { to: '/admin/messages/announcements', label: '공지발송', implemented: false },
  { to: '/admin/messages/direct', label: '개별발송', implemented: false },
  { to: '/admin/messages/crm', label: 'CRM 캠페인', implemented: false },
  { to: '/admin/messages/history', label: '발송이력', implemented: false },
] as const

export const DISPATCH_TYPE_LABELS: Record<DispatchType, string> = {
  automatic: '자동발송',
  announcement: '공지발송',
  direct: '개별발송',
  campaign: 'CRM 캠페인',
}
