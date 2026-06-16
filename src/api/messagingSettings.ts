import { getAdminSession } from '../lib/adminSession'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import {
  DEFAULT_CENTER_MESSAGING_SETTINGS,
  DEFAULT_MESSAGING_TEMPLATE_IDS,
  type CenterMessagingSettings,
  type MessagingTemplateIds,
} from '../types/messagingSettings'

function normalizeTemplateIds(raw: unknown): MessagingTemplateIds {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  return {
    welcome: String(row.welcome ?? ''),
    payment_done: String(row.payment_done ?? ''),
    renewal: String(row.renewal ?? ''),
    step_verification_result: String(row.step_verification_result ?? ''),
    pt_reminder: String(row.pt_reminder ?? ''),
  }
}

function normalizeSettings(raw: unknown): CenterMessagingSettings {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  return {
    enabled: row.enabled === true,
    usePlatformApiKeys: row.usePlatformApiKeys !== false,
    pfId: String(row.pfId ?? ''),
    fromNumber: String(row.fromNumber ?? ''),
    senderName: String(row.senderName ?? ''),
    templateIds: normalizeTemplateIds(row.templateIds),
  }
}

export type CenterMessagingSettingsResponse = {
  settings: CenterMessagingSettings
  hasCustomApiKeys: boolean
}

function parseSettingsResponse(data: Json): CenterMessagingSettingsResponse {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      settings: { ...DEFAULT_CENTER_MESSAGING_SETTINGS },
      hasCustomApiKeys: false,
    }
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    throw new Error(
      row.error != null ? String(row.error) : '메시지 설정을 불러올 수 없습니다.',
    )
  }

  return {
    settings: normalizeSettings(row.config),
    hasCustomApiKeys: row.hasCustomApiKeys === true,
  }
}

export async function fetchCenterMessagingSettings(): Promise<CenterMessagingSettingsResponse> {
  const session = getAdminSession()
  if (!session?.token) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data, error } = await supabase.rpc('get_center_messaging_settings', {
    p_session_token: session.token,
  })

  if (error) throw error
  return parseSettingsResponse(data)
}

export async function saveCenterMessagingSettings(input: {
  settings: CenterMessagingSettings
  apiKey?: string
  apiSecret?: string
  clearApiKeys?: boolean
}): Promise<CenterMessagingSettingsResponse> {
  const session = getAdminSession()
  if (!session?.token) {
    throw new Error('로그인이 필요합니다.')
  }

  const settings = normalizeSettings(input.settings)
  const payload = {
    enabled: settings.enabled,
    usePlatformApiKeys: settings.usePlatformApiKeys,
    pfId: settings.pfId.trim(),
    fromNumber: settings.fromNumber.replace(/\D/g, ''),
    senderName: settings.senderName.trim(),
    templateIds: {
      ...DEFAULT_MESSAGING_TEMPLATE_IDS,
      ...settings.templateIds,
    },
  }

  const { data, error } = await supabase.rpc('update_center_messaging_settings', {
    p_session_token: session.token,
    p_config: payload as unknown as Json,
    p_api_key: input.apiKey?.trim() || null,
    p_api_secret: input.apiSecret?.trim() || null,
    p_clear_api_keys: input.clearApiKeys ?? false,
  })

  if (error) throw error
  return parseSettingsResponse(data)
}
