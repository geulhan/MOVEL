/** MotionHub 알림톡 템플릿 가이드 (Solapi 심사용 — 본문은 Solapi 콘솔에 등록) */

import { MOTIONHUB_MEMBER_SIGNUP_PORTAL_URL } from './motionhubGuide'

export const ALIMTALK_BRAND_HEADER = '[모션허브]' as const

export const ALIMTALK_GREETING_PATTERN = '#{centerName} 회원님' as const

/** 신규 템플릿 키 상수 (12종) */
export const ALIMTALK_TEMPLATE_KEYS = {
  member_signup_guide: 'member_signup_guide',
  payment_completed: 'payment_completed',
  schedule_reminder: 'schedule_reminder',
  pt_remaining_3: 'pt_remaining_3',
  pt_remaining_1: 'pt_remaining_1',
  membership_expire_14: 'membership_expire_14',
  membership_expire_7: 'membership_expire_7',
  membership_expire_today: 'membership_expire_today',
  schedule_changed: 'schedule_changed',
  schedule_cancelled: 'schedule_cancelled',
  center_welcome: 'center_welcome',
  weekly_report: 'weekly_report',
} as const

/** Supabase Secrets 환경변수 키명 */
export const ALIMTALK_TEMPLATE_SECRET_KEYS = {
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
} as const

/** Solapi 템플릿 등록 시 복사·참고용 예시 (변수명은 코드와 동일해야 함) */
export const ALIMTALK_TEMPLATE_EXAMPLES = {
  member_signup_guide: `안녕하세요.

#{centerName} 입니다.

회원 등록이 완료되었습니다.

아래 링크에서
예약, 출석, 운동기록 등을
확인하실 수 있습니다.

${MOTIONHUB_MEMBER_SIGNUP_PORTAL_URL}

감사합니다.`,

  payment_completed: `[모션허브]
#{centerName} 회원님, #{amount} 결제가 완료되었습니다. (#{productName})

회원 포털: #{portalUrl}`,

  schedule_reminder: `[모션허브]
#{centerName} 회원님, #{className} 수업이 예정되어 있습니다.

일시: #{scheduleDate}
담당: #{trainerName}

#{portalUrl}`,

  pt_remaining_3: `[모션허브]
#{centerName} 회원님, PT 잔여 횟수가 #{remainingCount}회 남았습니다.

#{portalUrl}`,

  pt_remaining_1: `[모션허브]
#{centerName} 회원님, PT 잔여 횟수가 #{remainingCount}회 남았습니다.

#{portalUrl}`,

  membership_expire_14: `[모션허브]
#{centerName} 회원님, 회원권이 14일 후 만료됩니다.
만료일: #{expireDate}

#{portalUrl}`,

  membership_expire_7: `[모션허브]
#{centerName} 회원님, 회원권이 7일 후 만료됩니다.
만료일: #{expireDate}

#{portalUrl}`,

  membership_expire_today: `[모션허브]
#{centerName} 회원님, 회원권이 오늘 만료됩니다.
만료일: #{expireDate}

#{portalUrl}`,

  schedule_changed: `[모션허브]
#{centerName} 회원님, #{className} 예약이 변경되었습니다.

일시: #{scheduleDate}
담당: #{trainerName}`,

  schedule_cancelled: `[모션허브]
#{centerName} 회원님, #{className} 예약이 취소되었습니다.

일시: #{scheduleDate}
담당: #{trainerName}`,

  center_welcome: `모션허브 가입을 축하드립니다.

아래 가이드를 참고하여
회원 등록부터 시작해보세요.

이용가이드
#{guideUrl}

감사합니다.`,

  weekly_report: `[모션허브]
#{centerName} 주간 리포트 (#{reportWeek})

활성 회원: #{activeMembers}명
신규 가입: #{newMembers}명`,
} as const

export const ALIMTALK_TEMPLATE_VARIABLES = [
  '#{brandHeader}',
  '#{centerName}',
  '#{memberName}',
  '#{name}',
  '#{trainerName}',
  '#{scheduleDate}',
  '#{className}',
  '#{productName}',
  '#{amount}',
  '#{remainingCount}',
  '#{expireDate}',
  '#{guideUrl}',
  '#{portalUrl}',
  '#{reportWeek}',
  '#{activeMembers}',
  '#{newMembers}',
] as const

/** 만료 D-day → 승인된 membership_expire_* 템플릿 */
export function resolveMembershipExpireTemplateKey(
  daysLeft: number,
): 'membership_expire_14' | 'membership_expire_7' | 'membership_expire_today' {
  if (daysLeft >= 14) return 'membership_expire_14'
  if (daysLeft >= 7) return 'membership_expire_7'
  return 'membership_expire_today'
}
