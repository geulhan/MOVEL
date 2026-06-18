import { getCurrentCenterId } from '../lib/center'
import { formatSupabaseError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import type { Trainer } from '../types/database'

type RpcResult = { ok: boolean; error?: string }

function normalizeTrainerRow(row: Record<string, unknown>): Trainer {
  return {
    id: String(row.id),
    name: String(row.name),
    is_active: Boolean(row.is_active ?? true),
    settlement_mode: row.settlement_mode === 'fixed' ? 'fixed' : 'percent',
    settlement_rate:
      row.settlement_rate == null ? null : Number(row.settlement_rate),
    settlement_fixed_amount:
      row.settlement_fixed_amount == null
        ? null
        : Number(row.settlement_fixed_amount),
    center_id: row.center_id != null ? String(row.center_id) : undefined,
    created_at: String(row.created_at ?? ''),
  }
}

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

export async function fetchTrainers(options?: {
  activeOnly?: boolean
}): Promise<Trainer[]> {
  const centerId = await getCurrentCenterId()
  let query = supabase
    .from('trainers')
    .select('*')
    .eq('center_id', centerId)
    .order('name')

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) throw new Error(formatSupabaseError(error))
  return (data ?? []).map((row) => normalizeTrainerRow(row as Record<string, unknown>))
}

export type TrainerSettlementInput = {
  mode: 'percent' | 'fixed'
  settlementRate: number | null
  settlementFixedAmount: number | null
}

export async function updateTrainerSettlement(
  trainerId: string,
  input: TrainerSettlementInput,
): Promise<Trainer> {
  const mode = input.mode === 'fixed' ? 'fixed' : 'percent'
  const settlementRate =
    mode === 'percent' && input.settlementRate != null
      ? Math.min(100, Math.max(0, Math.round(input.settlementRate)))
      : null
  const settlementFixedAmount =
    mode === 'fixed' && input.settlementFixedAmount != null
      ? Math.max(0, Math.round(input.settlementFixedAmount))
      : null

  const { data, error } = await supabase
    .from('trainers')
    .update({
      settlement_mode: mode,
      settlement_rate: settlementRate,
      settlement_fixed_amount: settlementFixedAmount,
    })
    .eq('id', trainerId)
    .select('*')
    .single()

  if (error) throw new Error(formatSupabaseError(error))
  return normalizeTrainerRow(data as Record<string, unknown>)
}

/** @deprecated updateTrainerSettlement 사용 */
export async function updateTrainerSettlementRate(
  trainerId: string,
  settlementRate: number | null,
): Promise<Trainer> {
  return updateTrainerSettlement(trainerId, {
    mode: 'percent',
    settlementRate,
    settlementFixedAmount: null,
  })
}

export async function createTrainer(name: string): Promise<Trainer> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('강사 이름을 입력해 주세요.')

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
  return normalizeTrainerRow(data as Record<string, unknown>)
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
