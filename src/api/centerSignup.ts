import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'

export type CenterSignupInput = {
  name: string
  slug: string
  adminUsername: string
  adminPassword: string
  contactEmail?: string
  contactPhone?: string
}

export type CenterSignupResult = {
  centerId: string
  centerSlug: string
  centerName: string
  adminUsername: string
}

export async function selfRegisterCenter(
  input: CenterSignupInput,
): Promise<CenterSignupResult> {
  const { data, error } = await supabase.rpc('self_register_center', {
    p_name: input.name.trim(),
    p_slug: input.slug.trim().toLowerCase(),
    p_admin_username: input.adminUsername.trim().toLowerCase(),
    p_admin_password: input.adminPassword,
    p_contact_email: input.contactEmail?.trim() || null,
    p_contact_phone: input.contactPhone?.trim() || null,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 등록에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'slug_taken':
        throw new Error('이미 사용 중인 센터 주소입니다. 다른 주소를 입력해 주세요.')
      case 'reserved_slug':
        throw new Error('사용할 수 없는 센터 주소입니다.')
      case 'invalid_slug':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '센터 주소 형식이 올바르지 않습니다.',
        )
      case 'invalid_admin_password':
        throw new Error('비밀번호는 4자 이상이어야 합니다.')
      default:
        throw new Error('센터 등록에 실패했습니다.')
    }
  }

  const centerId = row.center_id != null ? String(row.center_id) : ''
  const centerSlug = row.center_slug != null ? String(row.center_slug) : ''
  const centerName = row.center_name != null ? String(row.center_name) : ''
  const adminUsername =
    row.admin_username != null ? String(row.admin_username) : ''

  if (!centerId || !centerSlug) {
    throw new Error('센터 등록 응답이 올바르지 않습니다.')
  }

  return { centerId, centerSlug, centerName, adminUsername }
}
