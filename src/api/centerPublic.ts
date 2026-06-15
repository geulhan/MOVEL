import { supabase } from '../lib/supabase'

export type CenterPublicInfo = {
  centerId: string
  centerName: string
  centerSlug: string
  logoUrl: string | null
}

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
