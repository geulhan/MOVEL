/** MotionHub 알림톡 템플릿 가이드 (Solapi 심사용 — 본문은 Solapi 콘솔에 등록) */

export const ALIMTALK_BRAND_HEADER = '[모션허브]' as const

export const ALIMTALK_GREETING_PATTERN = '#{centerName} 회원님' as const

/** Solapi 템플릿 등록 시 복사·참고용 예시 (변수명은 코드와 동일해야 함) */
export const ALIMTALK_TEMPLATE_EXAMPLES = {
  welcome: `[모션허브]
#{centerName} 회원님, 가입을 환영합니다.

회원 포털: #{portalUrl}
초기 비밀번호는 휴대폰 뒤 4자리입니다.`,

  payment_done: `[모션허브]
#{centerName} 회원님, #{amount} 결제가 완료되었습니다. (PT #{sessions}회)

회원 포털: #{portalUrl}`,

  renewal: `[모션허브]
#{centerName} 회원님, 회원권 만료가 #{daysLeft}일 남았습니다.
만료일 #{expiresAt} · 잔여 PT #{remainingSessions}회

#{portalUrl}`,

  step_verification_result: `[모션허브]
#{centerName} 회원님, 만보 인증 결과: #{result}
사유: #{reason}

#{portalUrl}`,

  pt_reminder: `[모션허브]
#{centerName} 회원님, PT 수업이 내일 예정되어 있습니다.

일시: #{scheduledAt}
담당: #{trainerName}

#{portalUrl}`,
} as const

export const ALIMTALK_TEMPLATE_VARIABLES = [
  '#{brandHeader}',
  '#{centerName}',
  '#{name}',
  '#{portalUrl}',
  '#{amount}',
  '#{sessions}',
  '#{daysLeft}',
  '#{expiresAt}',
  '#{remainingSessions}',
  '#{result}',
  '#{reason}',
  '#{scheduledAt}',
  '#{trainerName}',
  '#{phone}',
] as const
