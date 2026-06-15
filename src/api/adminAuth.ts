import { supabase } from '../lib/supabase'
import { resetCenterIdCache } from '../lib/center'
import { getErrorMessage } from '../lib/errors'
import { saveAdminAuth, type AdminRole } from '../lib/adminSession'
import type { Json } from '../types/database'

type AdminLoginResponse = {
  ok: boolean
  id?: string
  username?: string
  token?: string
  role?: AdminRole
  trainer_id?: string | null
  trainer_name?: string | null
  center_id?: string
  center_slug?: string
  center_name?: string
  error?: string
}

function parseLoginResponse(data: Json): AdminLoginResponse {
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
  const username = row.username != null ? String(row.username) : undefined
  const token = row.token != null ? String(row.token) : undefined
  const center_id = row.center_id != null ? String(row.center_id) : undefined
  const center_slug = row.center_slug != null ? String(row.center_slug) : undefined
  if (!id || !username || !token || !center_id || !center_slug) {
    return { ok: false, error: 'invalid_response_shape' }
  }

  const roleRaw = row.role != null ? String(row.role) : 'admin'
  const role: AdminRole = roleRaw === 'trainer' ? 'trainer' : 'admin'
  const trainer_id =
    row.trainer_id != null && row.trainer_id !== '' ? String(row.trainer_id) : null
  const trainer_name =
    row.trainer_name != null && row.trainer_name !== ''
      ? String(row.trainer_name)
      : null
  const center_name =
    row.center_name != null ? String(row.center_name) : center_slug

  return {
    ok: true,
    id,
    username,
    token,
    role,
    trainer_id,
    trainer_name,
    center_id,
    center_slug,
    center_name,
  }
}

function loginErrorMessage(row?: { error?: string; message?: string }): string {
  if (row?.message) return row.message
  switch (row?.error) {
    case 'center_not_found':
      return '센터를 찾을 수 없습니다.'
    case 'center_suspended':
      return '정지된 센터입니다. MotionHub에 문의해 주세요.'
    case 'center_service_expired':
      return '서비스 이용 기간이 만료된 센터입니다. MotionHub에 문의해 주세요.'
    case 'center_service_not_started':
      return '아직 서비스 이용이 시작되지 않은 센터입니다.'
    case 'center_inactive':
      return '센터 승인 대기 중입니다. MotionHub에서 이용 기간 설정 후 이용 가능합니다.'
    case 'multiple_centers':
      return '동일한 아이디가 여러 센터에 있습니다. 센터 주소를 입력해 주세요.'
    case 'invalid_response_shape':
      return (
        '로그인 응답 형식이 맞지 않습니다. Supabase에 migration_043 이상이 적용됐는지, ' +
        '구버전 verify_admin_login(text,text) 함수가 남아 있지 않은지 확인해 주세요.'
      )
    default:
      return '아이디 또는 비밀번호가 올바르지 않습니다.'
  }
}

export async function loginAdmin(
  username: string,
  password: string,
  centerSlug?: string,
): Promise<AdminSessionInfo> {
  const slug = centerSlug?.trim().toLowerCase() || undefined
  const rpcArgs = {
    p_username: username.trim(),
    p_password: password,
    p_center_slug: slug,
  }

  console.error('[loginAdmin] verify_admin_login request', {
    username: rpcArgs.p_username,
    center_slug: rpcArgs.p_center_slug,
  })

  const { data, error } = await supabase.rpc('verify_admin_login', rpcArgs)

  console.error('[loginAdmin] verify_admin_login response', { data, error })

  if (error) {
    throw new Error(getErrorMessage(error))
  }

  const result = parseLoginResponse(data)
  if (!result.ok || !result.id || !result.username || !result.token) {
    const row =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, Json | undefined>)
        : undefined
    throw new Error(
      loginErrorMessage({
        error: result.error ?? (row?.error != null ? String(row.error) : undefined),
        message: row?.message != null ? String(row.message) : undefined,
      }),
    )
  }

  const role = result.role ?? 'admin'
  resetCenterIdCache()
  saveAdminAuth(
    result.token,
    result.id,
    result.username,
    role,
    result.trainer_id ?? null,
    result.trainer_name ?? null,
    result.center_id!,
    result.center_slug!,
    result.center_name ?? result.center_slug!,
  )

  console.error('[loginAdmin] session saved', {
    adminId: result.id,
    centerSlug: result.center_slug,
    role,
  })

  return {
    adminId: result.id,
    username: result.username,
    role,
    trainerId: result.trainer_id ?? null,
    trainerName: result.trainer_name ?? null,
    centerId: result.center_id!,
    centerSlug: result.center_slug!,
    centerName: result.center_name ?? result.center_slug!,
  }
}

export type AdminSessionInfo = {
  adminId: string
  username: string
  role: AdminRole
  trainerId: string | null
  trainerName: string | null
  centerId: string
  centerSlug: string
  centerName: string
}
