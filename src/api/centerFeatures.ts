import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import {
  CENTER_FEATURE_KEYS,
  DEFAULT_CENTER_FEATURES,
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
    if (CENTER_FEATURE_KEYS.includes(key as (typeof CENTER_FEATURE_KEYS)[number])) {
      mapped[key as keyof CenterFeatures] = Boolean(row.enabled)
    }
  }

  return { ...DEFAULT_CENTER_FEATURES, ...mapped }
}
