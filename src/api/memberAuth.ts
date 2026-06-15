import { detectDeviceType } from '../lib/deviceType'
import { supabase } from '../lib/supabase'
import { formatSupabaseError } from '../lib/errors'
import { notifyMemberWelcome } from './notifications'
import { getMemberCenterSlug, saveMemberSession } from './memberPortal'
import type { Json } from '../types/database'
import { normalizePhone } from './members'

type MemberLoginResponse = {
  ok: boolean
  id?: string
  name?: string
  phone?: string
  token?: string
  center_id?: string
  center_slug?: string
  error?: string
}

type ChangePasswordResponse = {
  ok: boolean
  error?: string
}

function parseLoginResponse(data: Json): MemberLoginResponse {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false }
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    return {
      ok: false,
      error: row.error != null ? String(row.error) : undefined,
    }
  }

  const id = row.id != null ? String(row.id) : undefined
  const name = row.name != null ? String(row.name) : undefined
  const phone = row.phone != null ? String(row.phone) : undefined
  const token = row.token != null ? String(row.token) : undefined
  const center_id = row.center_id != null ? String(row.center_id) : undefined
  const center_slug = row.center_slug != null ? String(row.center_slug) : undefined
  if (!id || !token) return { ok: false }

  return { ok: true, id, name, phone, token, center_id, center_slug }
}

function loginErrorMessage(row?: { error?: string; message?: string }): string {
  if (row?.message) return row.message
  switch (row?.error) {
    case 'not_found':
      return '등록되지 않은 휴대전화번호입니다. 센터에 등록된 번호인지 확인해 주세요.'
    case 'no_credentials':
      return '회원 비밀번호가 설정되지 않았습니다. 센터에 문의해 주세요.'
    case 'wrong_password':
      return '비밀번호가 올바르지 않습니다. (최초 비밀번호: 휴대폰 뒤 4자리)'
    case 'invalid_input':
      return '아이디와 비밀번호를 입력해 주세요.'
    case 'center_not_configured':
      return '센터를 찾을 수 없습니다. 센터에서 안내한 링크로 접속해 주세요.'
    case 'center_suspended':
      return '이용이 정지된 센터입니다. 센터에 문의해 주세요.'
    case 'center_inactive':
      return '아직 이용이 시작되지 않은 센터입니다. 센터에 문의해 주세요.'
    case 'center_service_expired':
      return '센터 이용 기간이 만료되었습니다. 센터에 문의해 주세요.'
    case 'center_service_not_started':
      return '아직 센터 이용이 시작되지 않았습니다.'
    case 'multiple_centers':
      return '여러 센터에 등록된 번호입니다. 센터에서 안내한 링크로 접속해 주세요.'
    case 'center_required':
      return '가입할 센터를 선택해 주세요.'
    default:
      return '아이디 또는 비밀번호가 올바르지 않습니다.'
  }
}

function parseErrorRow(data: Json | null): { error?: string; message?: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const row = data as Record<string, Json | undefined>
  return {
    error: row.error != null ? String(row.error) : undefined,
    message: row.message != null ? String(row.message) : undefined,
  }
}

function parseChangePasswordResponse(data: Json): ChangePasswordResponse {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'unknown' }
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok === true) return { ok: true }

  return {
    ok: false,
    error: row.error != null ? String(row.error) : 'unknown',
  }
}

export function normalizeLoginPhone(phone: string): string {
  return normalizePhone(phone)
}

function registerErrorMessage(row?: { error?: string; message?: string }): string {
  if (row?.message) return row.message
  switch (row?.error) {
    case 'already_exists':
      return '이미 가입된 휴대전화번호입니다. 로그인해 주세요.'
    case 'invalid_name':
      return '이름을 입력해 주세요.'
    case 'invalid_phone':
      return '010으로 시작하는 11자리 휴대전화번호를 입력해 주세요.'
    case 'invalid_password':
      return '비밀번호는 4자리 이상이어야 합니다.'
    case 'center_required':
      return '가입할 센터를 선택해 주세요.'
    default:
      return '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

export async function registerMember(
  name: string,
  phone: string,
  password: string,
  centerSlug: string,
): Promise<{ memberId: string; memberName: string }> {
  const digits = normalizeLoginPhone(phone)
  const slug = centerSlug.trim().toLowerCase()
  if (!slug) {
    throw new Error('센터에서 안내한 회원 페이지 링크로 접속해 주세요.')
  }
  if (!name.trim()) {
    throw new Error('이름을 입력해 주세요.')
  }
  if (digits.length !== 11 || !digits.startsWith('010')) {
    throw new Error('010으로 시작하는 11자리 휴대전화번호를 입력해 주세요.')
  }
  if (password.length < 4) {
    throw new Error('비밀번호는 4자리 이상이어야 합니다.')
  }

  const { data, error } = await supabase.rpc('register_member', {
    p_name: name.trim(),
    p_phone: digits,
    p_password: password,
    p_device_type: detectDeviceType(),
    p_center_slug: slug,
  })

  if (error) {
    const msg = formatSupabaseError(error)
    if (msg.includes('register_member')) {
      throw new Error(
        '회원가입 DB 설정이 필요합니다. Supabase SQL Editor에서 migration_017_member_self_register.sql을 실행해 주세요.',
      )
    }
    throw new Error(msg)
  }

  const result = parseLoginResponse(data)
  if (!result.ok || !result.id || !result.token) {
    throw new Error(registerErrorMessage(parseErrorRow(data)))
  }

  saveMemberSession(
    result.id,
    result.token,
    result.center_slug,
    result.center_id,
  )
  notifyMemberWelcome(result.id)

  return {
    memberId: result.id,
    memberName: result.name ?? '회원',
  }
}

export async function loginMember(
  phone: string,
  password: string,
  centerSlug?: string,
): Promise<{ memberId: string; memberName: string }> {
  const digits = normalizeLoginPhone(phone)
  if (digits.length !== 11 || !digits.startsWith('010')) {
    throw new Error('아이디는 010으로 시작하는 11자리 숫자입니다.')
  }
  if (!password) {
    throw new Error('비밀번호를 입력해 주세요.')
  }

  const slug = centerSlug?.trim().toLowerCase() || undefined
  const { data, error } = await supabase.rpc('verify_member_login', {
    p_phone: digits,
    p_password: password,
    p_device_type: detectDeviceType(),
    p_center_slug: slug,
  })

  if (error) {
    const msg = formatSupabaseError(error)
    if (msg.includes('verify_member_login') || msg.includes('member_credentials')) {
      throw new Error(
        '회원 로그인 DB 설정이 필요합니다. Supabase SQL Editor에서 migration_014_member_auth.sql을 실행해 주세요.',
      )
    }
    throw new Error(msg)
  }

  const result = parseLoginResponse(data)
  if (!result.ok || !result.id || !result.token) {
    throw new Error(loginErrorMessage(parseErrorRow(data)))
  }

  saveMemberSession(
    result.id,
    result.token,
    result.center_slug,
    result.center_id,
  )
  return {
    memberId: result.id,
    memberName: result.name ?? '회원',
  }
}

export function getDefaultMemberPasswordHint(phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length >= 4) return digits.slice(-4)
  return '0000'
}

export async function resetMemberPasswordToDefault(
  memberId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('reset_member_password_to_default', {
    p_member_id: memberId,
  })

  if (error) {
    const msg = formatSupabaseError(error)
    if (msg.includes('reset_member_password_to_default')) {
      throw new Error(
        '비밀번호 초기화 DB 설정이 필요합니다. Supabase SQL Editor에서 migration_018_admin_reset_member_password.sql을 실행해 주세요.',
      )
    }
    throw new Error(msg)
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('비밀번호 초기화에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'not_found':
        throw new Error('회원을 찾을 수 없습니다.')
      default:
        throw new Error('비밀번호 초기화에 실패했습니다.')
    }
  }
}

export async function changeMemberPassword(
  phone: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const digits = normalizeLoginPhone(phone)

  if (!oldPassword || !newPassword) {
    throw new Error('현재 비밀번호와 새 비밀번호를 입력해 주세요.')
  }
  if (newPassword.length < 4) {
    throw new Error('새 비밀번호는 4자리 이상이어야 합니다.')
  }
  if (oldPassword === newPassword) {
    throw new Error('새 비밀번호는 현재 비밀번호와 달라야 합니다.')
  }

  const centerSlug = getMemberCenterSlug()
  if (!centerSlug) {
    throw new Error('센터 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
  }

  const { data, error } = await supabase.rpc('change_member_password', {
    p_phone: digits,
    p_old_password: oldPassword,
    p_new_password: newPassword,
    p_center_slug: centerSlug.trim().toLowerCase(),
  })

  if (error) throw error

  const result = parseChangePasswordResponse(data)
  if (!result.ok) {
    switch (result.error) {
      case 'wrong_password':
        throw new Error('현재 비밀번호가 올바르지 않습니다.')
      case 'too_short':
        throw new Error('새 비밀번호는 4자리 이상이어야 합니다.')
      default:
        throw new Error('비밀번호 변경에 실패했습니다.')
    }
  }
}
