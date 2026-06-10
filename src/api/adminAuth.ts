import { supabase } from '../lib/supabase'
import { saveAdminAuth } from '../lib/adminSession'
import type { Json } from '../types/database'

type AdminLoginResponse = {
  ok: boolean
  id?: string
  username?: string
  token?: string
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

  return { ok: true, id, username, token }
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

  saveAdminAuth(result.token, result.id, result.username)
  return { adminId: result.id, username: result.username }
}

export type AdminSessionInfo = {
  adminId: string
  username: string
}
