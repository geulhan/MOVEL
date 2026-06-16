import { getPlatformSession } from '../lib/platformSession'
import { supabase } from '../lib/supabase'
import type { BetaApplication, BetaCenterType, Json } from '../types/database'

function requirePlatformToken(): string {
  const session = getPlatformSession()
  if (!session?.token) {
    throw new Error('플랫폼 로그인이 필요합니다.')
  }
  return session.token
}

function parseCenterType(value: unknown): BetaCenterType {
  if (
    value === 'pt' ||
    value === 'pilates' ||
    value === 'freelance' ||
    value === 'other'
  ) {
    return value
  }
  return 'other'
}

export async function fetchBetaApplicationsForPlatform(): Promise<BetaApplication[]> {
  const { data, error } = await supabase.rpc('list_beta_applications_for_platform', {
    p_session_token: requirePlatformToken(),
  })

  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    if (row.error === 'unauthorized') {
      throw new Error('플랫폼 권한이 없습니다. 다시 로그인해 주세요.')
    }
    throw new Error('베타 신청 목록을 불러오지 못했습니다.')
  }

  if (!Array.isArray(row.applications)) return []

  return row.applications
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const app = item as Record<string, Json | undefined>
      const id = app.id != null ? String(app.id) : ''
      if (!id) return null

      return {
        id,
        center_name: app.center_name != null ? String(app.center_name) : '',
        contact_name: app.contact_name != null ? String(app.contact_name) : '',
        phone: app.phone != null ? String(app.phone) : '',
        email: app.email != null ? String(app.email) : null,
        center_type: parseCenterType(app.center_type),
        message: app.message != null ? String(app.message) : null,
        created_at: app.created_at != null ? String(app.created_at) : '',
      }
    })
    .filter((app): app is BetaApplication => app !== null)
}

export const BETA_CENTER_TYPE_LABELS: Record<BetaCenterType, string> = {
  pt: 'PT 센터',
  pilates: '필라테스',
  freelance: '프리랜서',
  other: '기타',
}
