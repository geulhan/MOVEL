import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import { notifyCenterWelcome } from './notifications'

export type CenterSignupInput = {
  name: string
  slug: string
  adminUsername: string
  adminPassword: string
  contactEmail?: string
  contactPhone: string
  desiredServiceStartsAt?: string
  agreeAge: boolean
  agreeTerms: boolean
  agreePrivacy: boolean
  agreeMarketing: boolean
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
    p_contact_phone: input.contactPhone.trim(),
    p_desired_service_starts_at: input.desiredServiceStartsAt || null,
    p_agree_age: input.agreeAge,
    p_agree_terms: input.agreeTerms,
    p_agree_privacy: input.agreePrivacy,
    p_agree_marketing: input.agreeMarketing,
  })

  if (error) {
    throw new Error(error.message || '센터 등록에 실패했습니다.')
  }

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
      case 'invalid_phone':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '010으로 시작하는 11자리 휴대전화번호를 입력해 주세요.',
        )
      case 'invalid_desired_start':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '희망 이용 시작일은 오늘 이후로 선택해 주세요.',
        )
      case 'consent_required':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '필수 약관에 모두 동의해 주세요.',
        )
      case 'invalid_name':
        throw new Error('센터명을 입력해 주세요.')
      case 'invalid_admin_username':
        throw new Error('관리자 아이디를 입력해 주세요.')
      case 'schema_outdated':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '서버 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.',
        )
      case 'server_error':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '센터 등록 중 오류가 발생했습니다.',
        )
      default:
        throw new Error(
          row.message != null
            ? String(row.message)
            : row.error != null
              ? `센터 등록에 실패했습니다. (${String(row.error)})`
              : '센터 등록에 실패했습니다.',
        )
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

  void notifyCenterWelcome(centerId)

  return { centerId, centerSlug, centerName, adminUsername }
}
