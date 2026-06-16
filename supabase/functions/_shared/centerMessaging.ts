import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import type { SolapiConfig } from './solapi.ts'

export type CenterMessagingContext = {
  centerId: string
  centerSlug: string
  centerName: string
  config: SolapiConfig
  source: 'center' | 'platform_fallback'
}

type CenterMessagingRow = {
  enabled: boolean
  use_platform_api_keys: boolean
  pf_id: string | null
  from_number: string | null
  sender_name: string | null
  template_welcome: string | null
  template_payment_done: string | null
  template_renewal: string | null
  template_step_verification_result: string | null
  template_pt_reminder: string | null
}

function platformSolapiConfig(): SolapiConfig {
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
    enabled:
      (Deno.env.get('MESSAGING_ENABLED') ?? 'false').toLowerCase() === 'true',
    siteUrl: (Deno.env.get('SITE_URL') ?? 'https://motionhub.kr').replace(
      /\/$/,
      '',
    ),
  }
}

function buildConfigFromRow(
  row: CenterMessagingRow,
  apiKey: string,
  apiSecret: string,
  platform: SolapiConfig,
): SolapiConfig {
  return {
    apiKey,
    apiSecret,
    pfId: row.pf_id?.trim() || platform.pfId,
    fromNumber: row.from_number?.trim() || platform.fromNumber,
    templateIds: {
      welcome: row.template_welcome?.trim() || platform.templateIds.welcome,
      payment_done:
        row.template_payment_done?.trim() || platform.templateIds.payment_done,
      renewal: row.template_renewal?.trim() || platform.templateIds.renewal,
      step_verification_result:
        row.template_step_verification_result?.trim() ||
        platform.templateIds.step_verification_result,
      pt_reminder:
        row.template_pt_reminder?.trim() || platform.templateIds.pt_reminder,
    },
    enabled: row.enabled && platform.enabled,
    siteUrl: platform.siteUrl,
  }
}

export async function loadCenterMessagingContext(
  supabase: SupabaseClient,
  centerId: string,
): Promise<CenterMessagingContext | null> {
  const platform = platformSolapiConfig()

  const { data: center, error: centerError } = await supabase
    .from('centers')
    .select('id, slug, name')
    .eq('id', centerId)
    .maybeSingle()

  if (centerError || !center) return null

  const { data: row } = await supabase
    .from('center_messaging_config')
    .select('*')
    .eq('center_id', centerId)
    .maybeSingle()

  if (!row) {
    const isMovel = String(center.slug) === 'movel'
    if (!isMovel || !platform.enabled) {
      return {
        centerId,
        centerSlug: String(center.slug),
        centerName: String(center.name),
        config: { ...platform, enabled: false },
        source: 'platform_fallback',
      }
    }
    return {
      centerId,
      centerSlug: String(center.slug),
      centerName: String(center.name),
      config: platform,
      source: 'platform_fallback',
    }
  }

  const messagingRow = row as CenterMessagingRow
  if (!messagingRow.enabled) {
    return {
      centerId,
      centerSlug: String(center.slug),
      centerName:
        messagingRow.sender_name?.trim() || String(center.name),
      config: {
        ...platform,
        enabled: false,
      },
      source: 'center',
    }
  }

  let apiKey = platform.apiKey
  let apiSecret = platform.apiSecret

  if (!messagingRow.use_platform_api_keys) {
    const { data: secrets } = await supabase
      .from('center_messaging_secrets')
      .select('api_key, api_secret')
      .eq('center_id', centerId)
      .maybeSingle()

    if (secrets?.api_key && secrets?.api_secret) {
      apiKey = String(secrets.api_key)
      apiSecret = String(secrets.api_secret)
    }
  }

  return {
    centerId,
    centerSlug: String(center.slug),
    centerName: messagingRow.sender_name?.trim() || String(center.name),
    config: buildConfigFromRow(messagingRow, apiKey, apiSecret, platform),
    source: 'center',
  }
}
