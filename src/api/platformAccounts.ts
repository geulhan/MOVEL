import { getPlatformSession } from '../lib/platformSession'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'

export type PlatformCenterUser = {
  id: string
  username: string
  role: string
  display_name: string | null
  phone: string | null
  status: string
  trainer_id: string | null
  trainer_name: string | null
  last_login_at: string | null
  created_at: string
}

export type SignupConsentRecord = {
  id: string
  subject_type: 'member' | 'center_admin'
  center_id: string | null
  center_name: string | null
  center_slug: string | null
  member_id: string | null
  center_user_id: string | null
  name: string | null
  phone: string | null
  email: string | null
  agree_age: boolean
  agree_terms: boolean
  agree_privacy: boolean
  agree_marketing: boolean
  created_at: string
}

function requirePlatformToken(): string {
  const session = getPlatformSession()
  if (!session?.token) {
    throw new Error('플랫폼 로그인이 필요합니다.')
  }
  return session.token
}

export async function fetchPlatformCenterUsers(
  centerId: string,
): Promise<PlatformCenterUser[]> {
  const { data, error } = await supabase.rpc('list_center_users_for_platform', {
    p_session_token: requirePlatformToken(),
    p_center_id: centerId,
  })

  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true || !Array.isArray(row.users)) return []

  return row.users
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const u = item as Record<string, Json | undefined>
      const id = u.id != null ? String(u.id) : ''
      const username = u.username != null ? String(u.username) : ''
      if (!id || !username) return null
      return {
        id,
        username,
        role: u.role != null ? String(u.role) : 'center_admin',
        display_name: u.display_name != null ? String(u.display_name) : null,
        phone: u.phone != null ? String(u.phone) : null,
        status: u.status != null ? String(u.status) : 'active',
        trainer_id: u.trainer_id != null ? String(u.trainer_id) : null,
        trainer_name: u.trainer_name != null ? String(u.trainer_name) : null,
        last_login_at: u.last_login_at != null ? String(u.last_login_at) : null,
        created_at: u.created_at != null ? String(u.created_at) : '',
      }
    })
    .filter((u): u is PlatformCenterUser => u !== null)
}

export async function updatePlatformCenterUserPhone(
  centerUserId: string,
  phone: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('update_center_user_phone_platform', {
    p_session_token: requirePlatformToken(),
    p_center_user_id: centerUserId,
    p_phone: phone,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('연락처 저장에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'invalid_phone':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '올바른 휴대전화번호를 입력해 주세요.',
        )
      case 'unauthorized':
        throw new Error('플랫폼 권한이 없습니다.')
      case 'not_found':
        throw new Error('계정을 찾을 수 없습니다.')
      default:
        throw new Error('연락처 저장에 실패했습니다.')
    }
  }

  return row.phone != null ? String(row.phone) : phone
}

export async function resetPlatformCenterUserPassword(
  centerUserId: string,
): Promise<{ username: string; tempPassword: string }> {
  const { data, error } = await supabase.rpc('reset_center_user_password_platform', {
    p_session_token: requirePlatformToken(),
    p_center_user_id: centerUserId,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('비밀번호 초기화에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'no_phone':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '등록된 휴대전화번호가 없습니다.',
        )
      case 'unauthorized':
        throw new Error('플랫폼 권한이 없습니다.')
      case 'not_found':
        throw new Error('계정을 찾을 수 없습니다.')
      default:
        throw new Error('비밀번호 초기화에 실패했습니다.')
    }
  }

  const username = row.username != null ? String(row.username) : ''
  const tempPassword = row.temp_password != null ? String(row.temp_password) : ''
  if (!username || !tempPassword) {
    throw new Error('비밀번호 초기화 응답이 올바르지 않습니다.')
  }

  return { username, tempPassword }
}

export async function fetchSignupConsentRecords(): Promise<SignupConsentRecord[]> {
  const { data, error } = await supabase.rpc('list_signup_consents_for_platform', {
    p_session_token: requirePlatformToken(),
  })

  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true || !Array.isArray(row.records)) return []

  return row.records
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const r = item as Record<string, Json | undefined>
      const id = r.id != null ? String(r.id) : ''
      if (!id) return null
      return {
        id,
        subject_type:
          r.subject_type === 'center_admin' ? 'center_admin' : 'member',
        center_id: r.center_id != null ? String(r.center_id) : null,
        center_name: r.center_name != null ? String(r.center_name) : null,
        center_slug: r.center_slug != null ? String(r.center_slug) : null,
        member_id: r.member_id != null ? String(r.member_id) : null,
        center_user_id:
          r.center_user_id != null ? String(r.center_user_id) : null,
        name: r.name != null ? String(r.name) : null,
        phone: r.phone != null ? String(r.phone) : null,
        email: r.email != null ? String(r.email) : null,
        agree_age: r.agree_age === true,
        agree_terms: r.agree_terms === true,
        agree_privacy: r.agree_privacy === true,
        agree_marketing: r.agree_marketing === true,
        created_at: r.created_at != null ? String(r.created_at) : '',
      }
    })
    .filter((r): r is SignupConsentRecord => r !== null)
}
