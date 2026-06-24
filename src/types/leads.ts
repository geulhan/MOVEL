export type LeadIdentityLevel = 'anonymous' | 'phone_only' | 'identified'

export type LeadSource =
  | 'phone'
  | 'visit'
  | 'instagram'
  | 'referral'
  | 'web'
  | 'other'

export type LeadInterest = 'pt' | 'pilates' | 'trial' | 'price' | 'other'

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'trial_scheduled'
  | 'trial_done'
  | 'pending_register'
  | 'converted'
  | 'on_hold'
  | 'lost'

export type LeadActivityType =
  | 'note'
  | 'call'
  | 'status_change'
  | 'name_confirmed'
  | 'phone_added'
  | 'converted'
  | 'privacy_agreed'
  | 'marketing_agreed'

export type ConsultationLead = {
  id: string
  center_id: string
  display_name: string
  display_label: string | null
  legal_name: string | null
  phone: string | null
  identity_level: LeadIdentityLevel
  source: LeadSource
  interest: LeadInterest
  message: string
  status: LeadStatus
  assigned_trainer_id: string | null
  assigned_trainer_name: string | null
  agree_privacy: boolean
  agree_marketing: boolean
  agree_marketing_at: string | null
  next_contact_at: string | null
  last_activity_at: string
  retention_until: string
  converted_member_id: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

export type LeadActivity = {
  id: string
  lead_id: string
  center_id: string
  activity_type: LeadActivityType
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: '신규 문의',
  contacted: '1차 연락 완료',
  trial_scheduled: '체험·상담 예약',
  trial_done: '체험 완료',
  pending_register: '등록 검토',
  converted: '등록 완료',
  on_hold: '보류',
  lost: '이탈',
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  phone: '전화',
  visit: '방문',
  instagram: '인스타·SNS',
  referral: '지인 소개',
  web: '웹·폼',
  other: '기타',
}

export const LEAD_INTEREST_LABELS: Record<LeadInterest, string> = {
  pt: 'PT',
  pilates: '필라테스',
  trial: '체험',
  price: '가격 문의',
  other: '기타',
}

export const LEAD_IDENTITY_LABELS: Record<LeadIdentityLevel, string> = {
  anonymous: '무기명',
  phone_only: '번호만',
  identified: '실명 확인',
}

export const LEAD_ACTIVE_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'trial_scheduled',
  'trial_done',
  'pending_register',
  'on_hold',
]
