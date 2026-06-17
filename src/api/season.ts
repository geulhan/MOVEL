import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import type { CreateSeasonInput, Season } from '../types/season'
import {
  claimSeasonRewardRpc,
  fetchSeasonPassStateRpc,
} from './season/seasonRepository'

export type { SeasonPassState } from '../types/season'
export { fetchSeasonPassStateRpc, claimSeasonRewardRpc }

export async function getSeasonPassState(memberId: string) {
  return fetchSeasonPassStateRpc(memberId)
}

export async function claimSeasonReward(memberId: string, seasonRewardId: string) {
  return claimSeasonRewardRpc(memberId, seasonRewardId)
}

function normalizeSeason(row: Record<string, unknown>): Season {
  return {
    id: String(row.id ?? ''),
    center_id: String(row.center_id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    start_date: String(row.start_date ?? '').slice(0, 10),
    end_date: String(row.end_date ?? '').slice(0, 10),
    max_level: Number(row.max_level) || 20,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at ?? ''),
  }
}

export async function fetchCenterSeasons(): Promise<Season[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('center_id', centerId)
    .order('start_date', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => normalizeSeason(row as Record<string, unknown>))
}

export async function createCenterSeason(input: CreateSeasonInput): Promise<Season> {
  const centerId = await getCurrentCenterId()
  if (input.end_date < input.start_date) {
    throw new Error('종료일은 시작일 이후여야 합니다.')
  }

  const { data, error } = await supabase
    .from('seasons')
    .insert({
      center_id: centerId,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      start_date: input.start_date,
      end_date: input.end_date,
      max_level: 20,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single()

  if (error) throw error

  const season = normalizeSeason(data as Record<string, unknown>)
  const { error: seedError } = await supabase.rpc('seed_season_default_rewards', {
    p_season_id: season.id,
  })
  if (seedError) throw seedError

  return season
}

export async function updateSeasonActive(seasonId: string, isActive: boolean): Promise<void> {
  const centerId = await getCurrentCenterId()
  const { error } = await supabase
    .from('seasons')
    .update({ is_active: isActive })
    .eq('id', seasonId)
    .eq('center_id', centerId)
  if (error) throw error
}
