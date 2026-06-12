import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'

export type TrainerAdminAccount = {
  admin_user_id: string
  trainer_id: string
  username: string
  created_at: string
}

type RpcResult = {
  ok: boolean
  error?: string
}

function parseAccountList(data: Json): TrainerAdminAccount[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null
      const item = row as Record<string, Json | undefined>
      const admin_user_id = item.admin_user_id != null ? String(item.admin_user_id) : ''
      const trainer_id = item.trainer_id != null ? String(item.trainer_id) : ''
      const username = item.username != null ? String(item.username) : ''
      const created_at = item.created_at != null ? String(item.created_at) : ''
      if (!admin_user_id || !trainer_id || !username) return null
      return { admin_user_id, trainer_id, username, created_at }
    })
    .filter((row): row is TrainerAdminAccount => row !== null)
}

function parseRpcResult(data: Json): RpcResult & Partial<TrainerAdminAccount> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: '처리에 실패했습니다.' }
  }
  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    return {
      ok: false,
      error: row.error != null ? String(row.error) : '처리에 실패했습니다.',
    }
  }
  return { ok: true }
}

export async function fetchTrainerAdminAccounts(): Promise<TrainerAdminAccount[]> {
  const { data, error } = await supabase.rpc('list_trainer_admin_accounts')
  if (error) throw error
  return parseAccountList(data)
}

export async function upsertTrainerAdminAccount(input: {
  trainerId: string
  username: string
  password: string
}): Promise<void> {
  const { data, error } = await supabase.rpc('upsert_trainer_admin_account', {
    p_trainer_id: input.trainerId,
    p_username: input.username.trim(),
    p_password: input.password,
  })
  if (error) throw error

  const result = parseRpcResult(data)
  if (!result.ok) {
    throw new Error(result.error ?? '트레이너 계정 저장에 실패했습니다.')
  }
}

export async function deleteTrainerAdminAccount(trainerId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_trainer_admin_account', {
    p_trainer_id: trainerId,
  })
  if (error) throw error

  const result = parseRpcResult(data)
  if (!result.ok) {
    throw new Error(result.error ?? '트레이너 계정 삭제에 실패했습니다.')
  }
}
