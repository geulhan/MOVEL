import { getCurrentCenterId } from '../lib/center'
import { formatSupabaseError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import type { Trainer } from '../types/database'

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
