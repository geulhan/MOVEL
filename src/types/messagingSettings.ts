export type MessagingTemplateIds = {
  welcome: string
  payment_done: string
  renewal: string
  step_verification_result: string
  pt_reminder: string
}

export type CenterMessagingSettings = {
  enabled: boolean
  usePlatformApiKeys: boolean
  pfId: string
  fromNumber: string
  senderName: string
  templateIds: MessagingTemplateIds
}

export const DEFAULT_MESSAGING_TEMPLATE_IDS: MessagingTemplateIds = {
  welcome: '',
  payment_done: '',
  renewal: '',
  step_verification_result: '',
  pt_reminder: '',
}

export const DEFAULT_CENTER_MESSAGING_SETTINGS: CenterMessagingSettings = {
  enabled: false,
  usePlatformApiKeys: true,
  pfId: '',
  fromNumber: '',
  senderName: '',
  templateIds: { ...DEFAULT_MESSAGING_TEMPLATE_IDS },
}

export const MESSAGING_TEMPLATE_FIELDS: Array<{
  key: keyof MessagingTemplateIds
  label: string
  hint: string
}> = [
  {
    key: 'welcome',
    label: '신규 가입 환영',
    hint: '변수: #{name}, #{centerName}, #{portalUrl}',
  },
  {
    key: 'payment_done',
    label: '결제 완료',
    hint: '변수: #{name}, #{centerName}, #{amount}, #{sessions}, #{portalUrl}',
  },
  {
    key: 'renewal',
    label: '재등록 안내',
    hint: '변수: #{name}, #{centerName}, #{daysLeft}, #{expiresAt}, #{remainingSessions}, #{portalUrl}',
  },
  {
    key: 'step_verification_result',
    label: '만보 인증 결과',
    hint: '변수: #{name}, #{centerName}, #{result}, #{reason}, #{portalUrl}',
  },
  {
    key: 'pt_reminder',
    label: 'PT 리마인더',
    hint: '변수: #{name}, #{centerName}, #{scheduledAt}, #{trainerName}, #{portalUrl}',
  },
]
