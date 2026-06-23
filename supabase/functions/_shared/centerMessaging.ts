import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { loadPlatformTemplateIds } from './alimtalkTemplateRegistry.ts'
import { MOTIONHUB_PUBLIC_ORIGIN, normalizePublicSiteUrl } from './publicSiteUrl.ts'
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
}

function platformSolapiConfig(): SolapiConfig {
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
    // MotionHub 공용 채널: 템플릿 ID는 플랫폼 Secrets만 사용 (센터별 커스텀 채널 제외)
    templateIds: platform.templateIds,
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
    .select(
      'enabled, use_platform_api_keys, pf_id, from_number, sender_name',
    )
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
      centerName: messagingRow.sender_name?.trim() || String(center.name),
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

export function getPlatformMessagingContext(
  centerId: string,
  centerSlug: string,
  centerName: string,
): CenterMessagingContext {
  const platform = platformSolapiConfig()
  return {
    centerId,
    centerSlug,
    centerName,
    config: platform,
    source: 'platform_fallback',
  }
}
