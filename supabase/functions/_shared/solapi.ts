import {
  loadPlatformTemplateIds,
  type AlimtalkTemplateKey,
} from './alimtalkTemplateRegistry.ts'
import { MOTIONHUB_PUBLIC_ORIGIN, normalizePublicSiteUrl } from './publicSiteUrl.ts'

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
    siteUrl: normalizePublicSiteUrl(
      Deno.env.get('SITE_URL') ?? MOTIONHUB_PUBLIC_ORIGIN,
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

/** true = 알림톡만 (문자 대체 끔). false = 알림톡 실패 시 문자 대체발송 (솔라피 기본) */
function isAlimtalkOnlyMode(): boolean {
  const raw = Deno.env.get('SOLAPI_DISABLE_SMS_FALLBACK') ?? 'false'
  return raw.toLowerCase() === 'true'
}

function formatKakaoTemplateError(
  message: string,
  templateKey: string,
  templateId: string,
  pfId: string,
): string {
  const lower = message.toLowerCase()
  if (
    message.includes('3033') ||
    message.includes('3105') ||
    lower.includes('미등록 템플릿') ||
    lower.includes('템플릿을 찾을 수 없')
  ) {
    const pfHint = pfId ? `pfId …${pfId.slice(-6)}` : 'pfId 미설정'
    return [
      '카카오 알림톡 템플릿을 찾을 수 없습니다 (3033/3105).',
      '솔라피 콘솔에서 해당 템플릿이 연결된 카카오 채널의 pfId를',
      'Supabase Secret SOLAPI_PF_ID에 설정했는지 확인해 주세요.',
      `(템플릿: ${templateKey}, ID: ${templateId}, ${pfHint})`,
    ].join(' ')
  }
  return message
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

  const templateId = config.templateIds[templateKey] ?? ''
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
          disableSms: isAlimtalkOnlyMode(),
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
    return {
      ok: false,
      error: formatKakaoTemplateError(
        message,
        String(templateKey),
        templateId,
        config.pfId,
      ),
      raw,
    }
  }

  const groupInfo = (raw as { groupInfo?: { groupId?: string } }).groupInfo
  const firstMessage = (
    raw as { messageList?: SolapiMessageListItem[] }
  ).messageList?.[0]
  const channel = resolveChannelFromSolapiType(firstMessage?.type)
  const statusMessage = firstMessage?.statusMessage?.trim() ?? ''

  if (statusMessage) {
    const formatted = formatKakaoTemplateError(
      statusMessage,
      String(templateKey),
      templateId,
      config.pfId,
    )
    if (formatted !== statusMessage) {
      return { ok: false, error: formatted, channel, raw }
    }
  }

  return {
    ok: true,
    messageId: firstMessage?.messageId ?? groupInfo?.groupId,
    channel,
    raw,
  }
}
