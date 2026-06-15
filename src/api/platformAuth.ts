import { supabase } from '../lib/supabase'
import { savePlatformAuth } from '../lib/platformSession'
import type { Json } from '../types/database'

type PlatformLoginResponse = {
  ok: boolean
  id?: string
  username?: string
  display_name?: string | null
  token?: string
}

function parseLoginResponse(data: Json): PlatformLoginResponse {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false }
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) return { ok: false }

  const id = row.id != null ? String(row.id) : undefined
  const username = row.username != null ? String(row.username) : undefined
  const token = row.token != null ? String(row.token) : undefined
  if (!id || !username || !token) return { ok: false }

  const display_name =
    row.display_name != null && row.display_name !== ''
      ? String(row.display_name)
      : null

  return { ok: true, id, username, token, display_name }
}

export async function loginPlatformAdmin(
  username: string,
  password: string,
): Promise<{ adminId: string; username: string; displayName: string | null }> {
  const { data, error } = await supabase.rpc('verify_platform_admin_login', {
    p_username: username.trim(),
    p_password: password,
  })

  if (error) throw error

  const result = parseLoginResponse(data)
  if (!result.ok || !result.id || !result.username || !result.token) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  savePlatformAuth(
    result.token,
    result.id,
    result.username,
    result.display_name ?? null,
  )

  return {
    adminId: result.id,
    username: result.username,
    displayName: result.display_name ?? null,
  }
}
