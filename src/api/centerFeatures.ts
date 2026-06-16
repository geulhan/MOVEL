import { getAdminSession } from '../lib/adminSession'
import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import {
  CENTER_FEATURE_KEYS,
  DEFAULT_CENTER_FEATURES,
  type CenterFeatureKey,
  type CenterFeatures,
} from '../types/centerFeatures'

export async function fetchCenterFeatures(centerId?: string): Promise<CenterFeatures> {
  const id = centerId ?? (await getCurrentCenterId())

  const { data, error } = await supabase
    .from('center_features')
    .select('feature_key, enabled')
    .eq('center_id', id)

  if (error) throw error

  const mapped: Partial<CenterFeatures> = {}
  for (const row of data ?? []) {
    const key = row.feature_key
    if (CENTER_FEATURE_KEYS.includes(key as CenterFeatureKey)) {
      mapped[key as CenterFeatureKey] = Boolean(row.enabled)
    }
  }

  return { ...DEFAULT_CENTER_FEATURES, ...mapped }
}

export async function saveCenterOperationalFeatures(
  features: Partial<CenterFeatures>,
): Promise<CenterFeatures> {
  const session = getAdminSession()
  if (!session?.token) {
    throw new Error('관리자 로그인이 필요합니다.')
  }

  const payload: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(features)) {
    if (typeof value === 'boolean') payload[key] = value
  }

  const { data, error } = await supabase.rpc('update_center_operational_features', {
    p_session_token: session.token,
    p_features: payload as Json,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('기능 설정 저장에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    if (row.error === 'forbidden') throw new Error('관리자만 변경할 수 있습니다.')
    throw new Error('기능 설정 저장에 실패했습니다.')
  }

  return parseFeaturesFromRpc(row.features)
}

function parseFeaturesFromRpc(raw: Json | undefined): CenterFeatures {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_CENTER_FEATURES }
  }
  return {
    ...DEFAULT_CENTER_FEATURES,
    ...parseCenterFeaturesFromRecord(raw as Record<string, unknown>),
  }
}

function parseCenterFeaturesFromRecord(
  raw: Record<string, unknown>,
): Partial<CenterFeatures> {
  const mapped: Partial<CenterFeatures> = {}
  for (const key of CENTER_FEATURE_KEYS) {
    const value = raw[key]
    if (typeof value === 'boolean') mapped[key] = value
  }
  return mapped
}
