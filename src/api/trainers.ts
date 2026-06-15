import { getCurrentCenterId } from '../lib/center'
import { formatSupabaseError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import type { Trainer } from '../types/database'

type RpcResult = { ok: boolean; error?: string }

function parseRpcResult(data: unknown): RpcResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: '처리에 실패했습니다.' }
  }
  const row = data as Record<string, unknown>
  if (row.ok !== true) {
    return {
      ok: false,
      error:
        row.error != null ? String(row.error) : '처리에 실패했습니다.',
    }
  }
  return { ok: true }
}

export async function fetchTrainers(): Promise<Trainer[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('trainers')
    .select('*')
    .eq('center_id', centerId)
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(formatSupabaseError(error))
  return data ?? []
}

export async function createTrainer(name: string): Promise<Trainer> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('트레이너 이름을 입력해 주세요.')

  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('trainers')
    .insert({ name: trimmed, center_id: centerId })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 등록된 트레이너입니다.')
    }
    throw new Error(formatSupabaseError(error))
  }
  return data
}

export async function deleteTrainer(trainerId: string): Promise<void> {
  const { data, error } = await supabase.rpc('deactivate_trainer', {
    p_trainer_id: trainerId,
  })

  if (error) throw new Error(formatSupabaseError(error))

  const result = parseRpcResult(data)
  if (!result.ok) {
    throw new Error(result.error ?? '트레이너 삭제에 실패했습니다.')
  }
}
