import { supabase } from '../lib/supabase'
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
}

function parseLoginResponse(data: Json): AdminLoginResponse {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false }
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) return { ok: false }

  const id = row.id != null ? String(row.id) : undefined
  const username = row.username != null ? String(row.username) : undefined
  const token = row.token != null ? String(row.token) : undefined
  if (!id || !username || !token) return { ok: false }

  const roleRaw = row.role != null ? String(row.role) : 'admin'
  const role: AdminRole = roleRaw === 'trainer' ? 'trainer' : 'admin'
  const trainer_id =
    row.trainer_id != null && row.trainer_id !== '' ? String(row.trainer_id) : null
  const trainer_name =
    row.trainer_name != null && row.trainer_name !== ''
      ? String(row.trainer_name)
      : null

  return { ok: true, id, username, token, role, trainer_id, trainer_name }
}

export async function loginAdmin(
  username: string,
  password: string,
): Promise<AdminSessionInfo> {
  const { data, error } = await supabase.rpc('verify_admin_login', {
    p_username: username.trim(),
    p_password: password,
  })

  if (error) throw error

  const result = parseLoginResponse(data)
  if (!result.ok || !result.id || !result.username || !result.token) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  const role = result.role ?? 'admin'
  saveAdminAuth(
    result.token,
    result.id,
    result.username,
    role,
    result.trainer_id ?? null,
    result.trainer_name ?? null,
  )

  return {
    adminId: result.id,
    username: result.username,
    role,
    trainerId: result.trainer_id ?? null,
    trainerName: result.trainer_name ?? null,
  }
}

export type AdminSessionInfo = {
  adminId: string
  username: string
  role: AdminRole
  trainerId: string | null
  trainerName: string | null
}
