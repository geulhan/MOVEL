import { getCurrentCenterId } from '../lib/center'
import {
  isAiReportViewed,
  isCenterSettingsVisited,
} from '../lib/centerOnboardingStorage'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'

export type CenterOnboardingProgress = {
  centerId: string
  centerName: string
  centerSlug: string
  centerInfoComplete: boolean
  memberCount: number
  firstMemberId: string | null
  scheduleCount: number
  attendanceLogCount: number
  completedScheduleCount: number
  journalCount: number
  alimtalkSentCount: number
  aiReportViewed: boolean
}

function hasSavedCenterSettings(settings: Json | null | undefined): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return false
  }
  const theme = (settings as Record<string, unknown>).theme
  return theme != null && typeof theme === 'object'
}

export async function fetchCenterOnboardingProgress(): Promise<CenterOnboardingProgress> {
  const centerId = await getCurrentCenterId()

  const [
    centerResult,
    membersResult,
    schedulesResult,
    attendanceResult,
    completedSchedulesResult,
    journalsResult,
    alimtalkResult,
  ] = await Promise.all([
    supabase
      .from('centers')
      .select('name, slug, logo_url, settings')
      .eq('id', centerId)
      .single(),
    supabase
      .from('members')
      .select('id')
      .eq('center_id', centerId)
      .order('registered_at', { ascending: false })
      .limit(1),
    supabase
      .from('pt_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId),
    supabase
      .from('attendance_logs')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId),
    supabase
      .from('pt_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('status', 'completed'),
    supabase
      .from('exercise_journals')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId),
    supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('template_key', 'member_signup_guide')
      .eq('status', 'sent'),
  ])

  if (centerResult.error) throw centerResult.error
  if (membersResult.error) throw membersResult.error
  if (schedulesResult.error) throw schedulesResult.error
  if (attendanceResult.error) throw attendanceResult.error
  if (completedSchedulesResult.error) throw completedSchedulesResult.error
  if (journalsResult.error) throw journalsResult.error
  if (alimtalkResult.error) throw alimtalkResult.error

  const center = centerResult.data
  const centerInfoComplete =
    isCenterSettingsVisited(centerId) ||
    Boolean(center?.logo_url) ||
    hasSavedCenterSettings(center?.settings)

  const memberRows = membersResult.data ?? []
  const memberCount = memberRows.length
  const firstMemberId = memberRows[0]?.id ? String(memberRows[0].id) : null

  return {
    centerId,
    centerName: center?.name ?? '',
    centerSlug: center?.slug ?? '',
    centerInfoComplete,
    memberCount,
    firstMemberId,
    scheduleCount: schedulesResult.count ?? 0,
    attendanceLogCount: attendanceResult.count ?? 0,
    completedScheduleCount: completedSchedulesResult.count ?? 0,
    journalCount: journalsResult.count ?? 0,
    alimtalkSentCount: alimtalkResult.count ?? 0,
    aiReportViewed: isAiReportViewed(centerId),
  }
}
