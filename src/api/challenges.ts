import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import type {
  CenterChallenge,
  CreateCenterChallengeInput,
} from '../types/challenges'

function normalizeChallenge(row: Record<string, unknown>): CenterChallenge {
  return {
    id: String(row.id ?? ''),
    center_id: String(row.center_id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    challenge_type: String(row.challenge_type ?? 'ATTENDANCE') as CenterChallenge['challenge_type'],
    target_value: Number(row.target_value) || 0,
    reward_growth: Number(row.reward_growth) || 0,
    reward_acorn: Number(row.reward_acorn) || 0,
    start_date: String(row.start_date ?? '').slice(0, 10),
    end_date: String(row.end_date ?? '').slice(0, 10),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at ?? ''),
  }
}

export async function fetchCenterChallenges(): Promise<CenterChallenge[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('center_challenges')
    .select('*')
    .eq('center_id', centerId)
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => normalizeChallenge(row as Record<string, unknown>))
}

export async function createCenterChallenge(
  input: CreateCenterChallengeInput,
): Promise<CenterChallenge> {
  const centerId = await getCurrentCenterId()

  if (input.target_value <= 0) {
    throw new Error('목표 횟수는 1 이상이어야 합니다.')
  }
  if (input.end_date < input.start_date) {
    throw new Error('종료일은 시작일 이후여야 합니다.')
  }
  if (
    !['ATTENDANCE', 'WORKOUT_LOG', 'PT_SESSION'].includes(input.challenge_type)
  ) {
    throw new Error('MVP에서는 출석·운동일지·PT 완료 챌린지만 생성할 수 있습니다.')
  }

  const { data, error } = await supabase
    .from('center_challenges')
    .insert({
      center_id: centerId,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      challenge_type: input.challenge_type,
      target_value: input.target_value,
      reward_growth: input.reward_growth,
      reward_acorn: input.reward_acorn,
      start_date: input.start_date,
      end_date: input.end_date,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single()

  if (error) throw error
  return normalizeChallenge(data as Record<string, unknown>)
}

export async function updateCenterChallengeActive(
  challengeId: string,
  isActive: boolean,
): Promise<void> {
  const centerId = await getCurrentCenterId()
  const { error } = await supabase
    .from('center_challenges')
    .update({ is_active: isActive })
    .eq('id', challengeId)
    .eq('center_id', centerId)

  if (error) throw error
}
