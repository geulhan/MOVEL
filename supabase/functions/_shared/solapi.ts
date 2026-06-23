import {
  loadPlatformTemplateIds,
  type AlimtalkTemplateKey,
} from './alimtalkTemplateRegistry.ts'

export type SolapiConfig = {
  apiKey: string
  apiSecret: string
  pfId: string
  fromNumber: string
  templateIds: Record<string, string>
  enabled: boolean
  siteUrl: string
}

export function getSolapiConfig(): SolapiConfig {
  return {
    apiKey: Deno.env.get('SOLAPI_API_KEY') ?? '',
    apiSecret: Deno.env.get('SOLAPI_API_SECRET') ?? '',
    pfId: Deno.env.get('SOLAPI_PF_ID') ?? '',
    fromNumber: Deno.env.get('SOLAPI_FROM_NUMBER') ?? '',
    templateIds: loadPlatformTemplateIds(),
    enabled:
      (Deno.env.get('MESSAGING_ENABLED') ?? 'false').toLowerCase() === 'true',
    siteUrl: (Deno.env.get('SITE_URL') ?? 'https://motionhub.kr').replace(
      /\/$/,
      '',
    ),
  }
}

export function isSolapiReady(
  config: SolapiConfig,
  templateKey: string,
): string | null {
  if (!config.enabled) return 'MESSAGING_ENABLED is false'
  if (!config.apiKey || !config.apiSecret) return 'SOLAPI API keys missing'
  if (!config.pfId) return 'SOLAPI_PF_ID missing'
  if (!config.fromNumber) return 'SOLAPI_FROM_NUMBER missing'
  const templateId = config.templateIds[templateKey]?.trim()
  if (!templateId) {
    return 'missing_template_id'
  }
  return null
}

export function isCenterMessagingReady(
  context: { config: SolapiConfig },
  templateKey: string,
): string | null {
  return isSolapiReady(context.config, templateKey)
}

async function createAuthorizationHeader(
  apiKey: string,
  apiSecret: string,
): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, '')
  const date = new Date().toISOString()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(date + salt),
  )
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

type SolapiMessageListItem = {
  messageId?: string
  type?: string
  statusCode?: string
  statusMessage?: string
}

function resolveChannelFromSolapiType(type?: string): 'alimtalk' | 'sms' {
  const normalized = (type ?? '').toUpperCase()
  if (normalized === 'ATA') return 'alimtalk'
  if (
    normalized === 'SMS' ||
    normalized === 'LMS' ||
    normalized === 'MMS'
  ) {
    return 'sms'
  }
  return 'alimtalk'
}

function isAlimtalkOnlyMode(): boolean {
  const raw = Deno.env.get('SOLAPI_DISABLE_SMS_FALLBACK') ?? 'true'
  return raw.toLowerCase() !== 'false'
}

export type SolapiSendResult = {
  ok: boolean
  messageId?: string
  channel?: 'alimtalk' | 'sms'
  error?: string
  raw?: unknown
}

export async function sendAlimtalk(
  config: SolapiConfig,
  templateKey: AlimtalkTemplateKey | string,
  to: string,
  variables: Record<string, string>,
): Promise<SolapiSendResult> {
  const readiness = isSolapiReady(config, templateKey)
  if (readiness) {
    return { ok: false, error: readiness }
  }

  const templateId = config.templateIds[templateKey]
  const authorization = await createAuthorizationHeader(
    config.apiKey,
    config.apiSecret,
  )

  const body = {
    showMessageList: true,
    messages: [
      {
        to: to.replace(/\D/g, ''),
        from: config.fromNumber.replace(/\D/g, ''),
        kakaoOptions: {
          pfId: config.pfId,
          templateId,
          variables,
          // 알림톡 실패 시 문자 대체발송 비활성화 (기본). 명시적 허용: SOLAPI_DISABLE_SMS_FALLBACK=false
          disableSms: !isAlimtalkOnlyMode(),
        },
      },
    ],
  }

  const response = await fetch(
    'https://api.solapi.com/messages/v4/send-many/detail',
    {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  const raw = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      (raw as { errorMessage?: string }).errorMessage ??
      (raw as { message?: string }).message ??
      `Solapi HTTP ${response.status}`
    return { ok: false, error: message, raw }
  }

  const groupInfo = (raw as { groupInfo?: { groupId?: string } }).groupInfo
  const firstMessage = (
    raw as { messageList?: SolapiMessageListItem[] }
  ).messageList?.[0]
  const channel = resolveChannelFromSolapiType(firstMessage?.type)
  const statusMessage = firstMessage?.statusMessage?.trim() ?? ''

  if (isAlimtalkOnlyMode() && channel === 'sms') {
    return {
      ok: false,
      error:
        statusMessage ||
        '알림톡 대신 문자로 대체발송되었습니다. 솔라피 템플릿·채널 설정을 확인해 주세요.',
      channel: 'sms',
      raw,
    }
  }

  return {
    ok: true,
    messageId: firstMessage?.messageId ?? groupInfo?.groupId,
    channel,
    raw,
  }
}
