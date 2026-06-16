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
    templateIds: {
      welcome: Deno.env.get('SOLAPI_TEMPLATE_WELCOME') ?? '',
      payment_done: Deno.env.get('SOLAPI_TEMPLATE_PAYMENT') ?? '',
      renewal: Deno.env.get('SOLAPI_TEMPLATE_RENEWAL') ?? '',
      step_verification_result:
        Deno.env.get('SOLAPI_TEMPLATE_STEP_RESULT') ?? '',
      pt_reminder: Deno.env.get('SOLAPI_TEMPLATE_PT_REMINDER') ?? '',
    },
    enabled: (Deno.env.get('MESSAGING_ENABLED') ?? 'false').toLowerCase() === 'true',
    siteUrl: (Deno.env.get('SITE_URL') ?? 'https://movel.vercel.app').replace(
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
  if (!config.templateIds[templateKey]) {
    return `Template ID missing for ${templateKey}`
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

export type SolapiSendResult = {
  ok: boolean
  messageId?: string
  channel?: 'alimtalk' | 'sms'
  error?: string
  raw?: unknown
}

export async function sendAlimtalk(
  config: SolapiConfig,
  templateKey: string,
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
    messages: [
      {
        to: to.replace(/\D/g, ''),
        from: config.fromNumber.replace(/\D/g, ''),
        kakaoOptions: {
          pfId: config.pfId,
          templateId,
          variables,
          disableSms: false,
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
  const firstMessage = (raw as { messageList?: Array<{ messageId?: string; statusCode?: string }> })
    .messageList?.[0]

  return {
    ok: true,
    messageId: firstMessage?.messageId ?? groupInfo?.groupId,
    channel: 'alimtalk',
    raw,
  }
}
