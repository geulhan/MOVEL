import { getPlatformSession } from '../lib/platformSession'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import type { CenterFeatures } from '../types/centerFeatures'
import { parseCenterFeatures } from '../types/centerFeatures'

export type PlatformCenter = {
  id: string
  name: string
  slug: string
  status: string
  plan_code: string | null
  member_count: number
  trainer_count: number
  features: CenterFeatures
  created_at: string
}

export type CreateCenterInput = {
  name: string
  slug: string
  adminUsername: string
  adminPassword: string
  planCode?: string
  contactEmail?: string
  contactPhone?: string
}

export type CreateCenterResult = {
  centerId: string
  centerSlug: string
  centerName: string
  adminUsername: string
}

function requirePlatformToken(): string {
  const session = getPlatformSession()
  if (!session?.token) {
    throw new Error('플랫폼 로그인이 필요합니다.')
  }
  return session.token
}

function parseCenterList(data: Json): PlatformCenter[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const row = data as Record<string, Json | undefined>
  if (row.ok !== true || !Array.isArray(row.centers)) return []

  return row.centers
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const c = item as Record<string, Json | undefined>
      const id = c.id != null ? String(c.id) : ''
      const name = c.name != null ? String(c.name) : ''
      const slug = c.slug != null ? String(c.slug) : ''
      if (!id || !name || !slug) return null
      return {
        id,
        name,
        slug,
        status: c.status != null ? String(c.status) : 'active',
        plan_code: c.plan_code != null ? String(c.plan_code) : null,
        member_count: typeof c.member_count === 'number' ? c.member_count : 0,
        trainer_count:
          typeof c.trainer_count === 'number' ? c.trainer_count : 0,
        features: parseCenterFeatures(c.features),
        created_at: c.created_at != null ? String(c.created_at) : '',
      }
    })
    .filter((c): c is PlatformCenter => c !== null)
}

export async function fetchPlatformCenters(): Promise<PlatformCenter[]> {
  const { data, error } = await supabase.rpc('list_centers_for_platform', {
    p_session_token: requirePlatformToken(),
  })

  if (error) throw error
  if (data == null) return []
  return parseCenterList(data)
}

export async function createPlatformCenter(
  input: CreateCenterInput,
): Promise<CreateCenterResult> {
  const { data, error } = await supabase.rpc('create_center', {
    p_session_token: requirePlatformToken(),
    p_name: input.name.trim(),
    p_slug: input.slug.trim().toLowerCase(),
    p_admin_username: input.adminUsername.trim().toLowerCase(),
    p_admin_password: input.adminPassword,
    p_plan_code: input.planCode ?? 'starter',
    p_contact_email: input.contactEmail?.trim() || null,
    p_contact_phone: input.contactPhone?.trim() || null,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 생성에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'unauthorized':
        throw new Error('플랫폼 권한이 없습니다. 다시 로그인해 주세요.')
      case 'slug_taken':
        throw new Error('이미 사용 중인 센터 코드입니다.')
      case 'invalid_slug':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '센터 코드 형식이 올바르지 않습니다.',
        )
      case 'invalid_admin_password':
        throw new Error('관리자 비밀번호는 4자 이상이어야 합니다.')
      default:
        throw new Error('센터 생성에 실패했습니다.')
    }
  }

  const centerId = row.center_id != null ? String(row.center_id) : ''
  const centerSlug = row.center_slug != null ? String(row.center_slug) : ''
  const centerName = row.center_name != null ? String(row.center_name) : ''
  const adminUsername =
    row.admin_username != null ? String(row.admin_username) : ''

  if (!centerId || !centerSlug) {
    throw new Error('센터 생성 응답이 올바르지 않습니다.')
  }

  return { centerId, centerSlug, centerName, adminUsername }
}

export async function deletePlatformCenter(
  centerId: string,
  confirmSlug: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('delete_center', {
    p_session_token: requirePlatformToken(),
    p_center_id: centerId,
    p_confirm_slug: confirmSlug.trim().toLowerCase(),
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 삭제에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'protected_center':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '이 센터는 삭제할 수 없습니다.',
        )
      case 'slug_mismatch':
        throw new Error('센터 코드 확인이 일치하지 않습니다.')
      case 'unauthorized':
        throw new Error('플랫폼 권한이 없습니다.')
      default:
        throw new Error('센터 삭제에 실패했습니다.')
    }
  }
}

export async function suspendPlatformCenter(centerId: string): Promise<void> {
  const { data, error } = await supabase.rpc('suspend_center', {
    p_session_token: requirePlatformToken(),
    p_center_id: centerId,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 정지에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    throw new Error('센터 정지에 실패했습니다.')
  }
}

export async function updatePlatformCenterFeatures(
  centerId: string,
  features: CenterFeatures,
): Promise<CenterFeatures> {
  const { data, error } = await supabase.rpc('update_center_features', {
    p_session_token: requirePlatformToken(),
    p_center_id: centerId,
    p_features: features as unknown as Json,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('이용 권한 저장에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'unauthorized':
        throw new Error('플랫폼 권한이 없습니다.')
      case 'not_found':
        throw new Error('센터를 찾을 수 없습니다.')
      default:
        throw new Error('이용 권한 저장에 실패했습니다.')
    }
  }

  return parseCenterFeatures(row.features)
}
