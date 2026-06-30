import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { isMemberPortalShared, isCenterSettingsVisited } from '../lib/centerOnboardingStorage'

export type CenterOnboardingProgress = {
  centerId: string
  centerName: string
  centerSlug: string
  settingsVisited: boolean
  memberCount: number
  trainerCount: number
  scheduleCount: number
  sessionLogCount: number
  memberLoginCount: number
  memberPortalShared: boolean
}

export async function fetchCenterOnboardingProgress(): Promise<CenterOnboardingProgress> {
  const centerId = await getCurrentCenterId()

  const [
    centerResult,
    membersResult,
    trainersResult,
    schedulesResult,
    sessionsResult,
  ] = await Promise.all([
    supabase
      .from('centers')
      .select('name, slug')
      .eq('id', centerId)
      .single(),
    supabase
      .from('members')
      .select('id')
      .eq('center_id', centerId),
    supabase
      .from('trainers')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId),
    supabase
      .from('pt_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId),
    supabase
      .from('pt_session_logs')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId),
  ])

  if (centerResult.error) throw centerResult.error
  if (membersResult.error) throw membersResult.error
  if (trainersResult.error) throw trainersResult.error
  if (schedulesResult.error) throw schedulesResult.error
  if (sessionsResult.error) throw sessionsResult.error

  const memberIds = (membersResult.data ?? []).map((row) => row.id)
  let memberLoginCount = 0

  if (memberIds.length > 0) {
    const { count, error } = await supabase
      .from('member_credentials')
      .select('member_id', { count: 'exact', head: true })
      .in('member_id', memberIds)

    if (error) throw error
    memberLoginCount = count ?? 0
  }

  const center = centerResult.data

  return {
    centerId,
    centerName: center?.name ?? '',
    centerSlug: center?.slug ?? '',
    settingsVisited: isCenterSettingsVisited(centerId),
    memberCount: memberIds.length,
    trainerCount: trainersResult.count ?? 0,
    scheduleCount: schedulesResult.count ?? 0,
    sessionLogCount: sessionsResult.count ?? 0,
    memberLoginCount,
    memberPortalShared: isMemberPortalShared(centerId),
  }
}
