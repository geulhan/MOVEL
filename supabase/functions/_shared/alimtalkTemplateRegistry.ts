/**
 * MotionHub 공용 카카오 채널 알림톡 템플릿 레지스트리 (12종 + 만보 인증 레거시)
 * 템플릿 ID는 Supabase Secrets / 환경변수에 등록 (승인 전에는 비워 둠)
 */

export const MEMBER_ALIMTALK_TEMPLATE_KEYS = [
  'member_signup_guide',
  'payment_completed',
  'schedule_reminder',
  'pt_remaining_3',
  'pt_remaining_1',
  'membership_expire_14',
  'membership_expire_7',
  'membership_expire_today',
  'schedule_changed',
  'schedule_cancelled',
] as const

export const CENTER_ALIMTALK_TEMPLATE_KEYS = [
  'center_welcome',
  'weekly_report',
] as const

/** 기존 기능 유지 (12종 범위 외) */
export const EXTRA_ALIMTALK_TEMPLATE_KEYS = [
  'step_verification_result',
] as const

/** DB 이력 호환용 (신규 발송에서는 사용하지 않음) */
export const LEGACY_ALIMTALK_TEMPLATE_KEYS = [
  'member_welcome',
  'welcome',
  'payment_done',
  'renewal',
  'pt_reminder',
] as const

export const ALL_ALIMTALK_TEMPLATE_KEYS = [
  ...MEMBER_ALIMTALK_TEMPLATE_KEYS,
  ...CENTER_ALIMTALK_TEMPLATE_KEYS,
  ...EXTRA_ALIMTALK_TEMPLATE_KEYS,
  ...LEGACY_ALIMTALK_TEMPLATE_KEYS,
] as const

export type MemberAlimtalkTemplateKey =
  (typeof MEMBER_ALIMTALK_TEMPLATE_KEYS)[number]
export type CenterAlimtalkTemplateKey =
  (typeof CENTER_ALIMTALK_TEMPLATE_KEYS)[number]
export type AlimtalkTemplateKey = (typeof ALL_ALIMTALK_TEMPLATE_KEYS)[number]

/** Supabase Secrets / Edge Function 환경변수 키명 */
export const TEMPLATE_SECRET_ENV_NAMES: Record<
  MemberAlimtalkTemplateKey | CenterAlimtalkTemplateKey | 'step_verification_result',
  string
> = {
  member_signup_guide: 'SOLAPI_TEMPLATE_MEMBER_SIGNUP_GUIDE',
  payment_completed: 'SOLAPI_TEMPLATE_PAYMENT_COMPLETED',
  schedule_reminder: 'SOLAPI_TEMPLATE_SCHEDULE_REMINDER',
  pt_remaining_3: 'SOLAPI_TEMPLATE_PT_REMAINING_3',
  pt_remaining_1: 'SOLAPI_TEMPLATE_PT_REMAINING_1',
  membership_expire_14: 'SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_14',
  membership_expire_7: 'SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_7',
  membership_expire_today: 'SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_TODAY',
  schedule_changed: 'SOLAPI_TEMPLATE_SCHEDULE_CHANGED',
  schedule_cancelled: 'SOLAPI_TEMPLATE_SCHEDULE_CANCELLED',
  center_welcome: 'SOLAPI_TEMPLATE_CENTER_WELCOME',
  weekly_report: 'SOLAPI_TEMPLATE_WEEKLY_REPORT',
  step_verification_result: 'SOLAPI_TEMPLATE_STEP_RESULT',
}

/** API 요청 시 구 키 → 신규 키 정규화 */
export const LEGACY_TEMPLATE_KEY_ALIASES: Record<string, AlimtalkTemplateKey> = {
  member_welcome: 'member_signup_guide',
  welcome: 'member_signup_guide',
  payment_done: 'payment_completed',
  pt_reminder: 'schedule_reminder',
  renewal: 'membership_expire_7',
}

export const SEND_NOTIFICATION_MEMBER_KEYS = new Set<AlimtalkTemplateKey>([
  'member_signup_guide',
  'payment_completed',
  'step_verification_result',
])

export const SEND_NOTIFICATION_CENTER_KEYS = new Set<AlimtalkTemplateKey>([
  'center_welcome',
])

export const SEND_NOTIFICATION_EVENT_KEYS = new Set<AlimtalkTemplateKey>([
  'schedule_changed',
  'schedule_cancelled',
])

export const SCHEDULE_REMINDERS_KEYS = new Set<AlimtalkTemplateKey>([
  'schedule_reminder',
])

export const PT_REMINDERS_KEYS = new Set<AlimtalkTemplateKey>([
  'pt_remaining_3',
  'pt_remaining_1',
])

export const RENEWAL_REMINDERS_KEYS = new Set<AlimtalkTemplateKey>([
  'membership_expire_14',
  'membership_expire_7',
  'membership_expire_today',
])

export const TEMPLATE_LABELS: Record<
  MemberAlimtalkTemplateKey | CenterAlimtalkTemplateKey | 'step_verification_result',
  string
> = {
  member_signup_guide: '회원가입 안내',
  payment_completed: '결제 완료',
  schedule_reminder: '수업 리마인더',
  pt_remaining_3: 'PT 잔여 3회 알림',
  pt_remaining_1: 'PT 잔여 1회 알림',
  membership_expire_14: '회원권 만료 14일 전',
  membership_expire_7: '회원권 만료 7일 전',
  membership_expire_today: '회원권 만료 당일',
  schedule_changed: '예약 변경',
  schedule_cancelled: '예약 취소',
  center_welcome: '센터 가입 축하',
  weekly_report: '모션허브 주간 리포트',
  step_verification_result: '만보 인증 결과',
}

export function normalizeTemplateKey(
  raw: string,
): AlimtalkTemplateKey | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if ((ALL_ALIMTALK_TEMPLATE_KEYS as readonly string[]).includes(trimmed)) {
    return trimmed as AlimtalkTemplateKey
  }
  return LEGACY_TEMPLATE_KEY_ALIASES[trimmed] ?? null
}

export function isCenterTemplate(
  key: AlimtalkTemplateKey,
): key is CenterAlimtalkTemplateKey {
  return (CENTER_ALIMTALK_TEMPLATE_KEYS as readonly string[]).includes(key)
}

export function isMemberTemplate(
  key: AlimtalkTemplateKey,
): key is MemberAlimtalkTemplateKey {
  return (MEMBER_ALIMTALK_TEMPLATE_KEYS as readonly string[]).includes(key)
}

export function usesCenterCredits(key: AlimtalkTemplateKey): boolean {
  return isMemberTemplate(key) || key === 'step_verification_result'
}

export function loadPlatformTemplateIds(): Record<string, string> {
  const ids: Record<string, string> = {}
  for (const [templateKey, envName] of Object.entries(
    TEMPLATE_SECRET_ENV_NAMES,
  )) {
    ids[templateKey] = Deno.env.get(envName) ?? ''
  }

  // 이전 Secret 이름 호환
  if (!ids.member_signup_guide?.trim()) {
    ids.member_signup_guide =
      Deno.env.get('SOLAPI_TEMPLATE_MEMBER_WELCOME') ?? ''
  }

  for (const legacyKey of LEGACY_ALIMTALK_TEMPLATE_KEYS) {
    const normalized = LEGACY_TEMPLATE_KEY_ALIASES[legacyKey]
    if (normalized && ids[normalized]) {
      ids[legacyKey] = ids[normalized]
    }
  }
  return ids
}
