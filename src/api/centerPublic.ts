import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'

export type CenterPublicInfo = {
  centerId: string
  centerName: string
  centerSlug: string
  logoUrl: string | null
}

export type SignupCenterOption = CenterPublicInfo

export async function fetchCenterPublicInfo(
  slug: string,
): Promise<CenterPublicInfo | null> {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null

  const { data, error } = await supabase
    .from('centers')
    .select('id, name, slug, logo_url')
    .eq('slug', normalized)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    centerId: String(data.id),
    centerName: String(data.name),
    centerSlug: String(data.slug),
    logoUrl: data.logo_url ? String(data.logo_url) : null,
  }
}

export async function fetchSignupCenters(): Promise<SignupCenterOption[]> {
  const { data, error } = await supabase.rpc('list_signup_centers')

  if (error) {
    const { data: rows, error: fallbackError } = await supabase
      .from('centers')
      .select('id, name, slug, logo_url')
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('name')

    if (fallbackError) throw fallbackError

    return (rows ?? []).map((row) => ({
      centerId: String(row.id),
      centerName: String(row.name),
      centerSlug: String(row.slug),
      logoUrl: row.logo_url ? String(row.logo_url) : null,
    }))
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const payload = data as Record<string, Json | undefined>
  if (payload.ok !== true || !Array.isArray(payload.centers)) return []

  return payload.centers
    .filter((row): row is Record<string, Json | undefined> => !!row && typeof row === 'object')
    .map((row) => ({
      centerId: String(row.id ?? ''),
      centerName: String(row.name ?? ''),
      centerSlug: String(row.slug ?? ''),
      logoUrl: row.logo_url != null ? String(row.logo_url) : null,
    }))
    .filter((row) => row.centerId && row.centerSlug && row.centerName)
}
