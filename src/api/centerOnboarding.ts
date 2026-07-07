import { OPERATIONAL_FEATURE_KEYS } from '../types/centerFeatures'
import { getCurrentCenterId } from '../lib/center'
import {
  isAiReportGenerated,
  isCenterFeaturesConfigured,
  isCenterSettingsVisited,
} from '../lib/centerOnboardingStorage'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'

export type CenterOnboardingProgress = {
  centerId: string
  centerName: string
  centerSlug: string
  centerInfoComplete: boolean
  operationalFeaturesConfigured: boolean
  memberCount: number
  firstMemberId: string | null
  scheduleCount: number
  attendanceLogCount: number
  completedScheduleCount: number
  journalCount: number
  alimtalkSentCount: number
  memberLoginCount: number
  aiReportGenerated: boolean
}

function hasSavedCenterSettings(settings: Json | null | undefined): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return false
  }
  const record = settings as Record<string, unknown>
  const theme = record.theme
  const onboarding = record.onboarding
  if (
    onboarding &&
    typeof onboarding === 'object' &&
    !Array.isArray(onboarding) &&
    (onboarding as Record<string, unknown>).featuresConfigured === true
  ) {
    return true
  }
  return theme != null && typeof theme === 'object'
}

async function hasOperationalFeaturesConfigured(
  centerId: string,
  centerCreatedAt: string | undefined,
  settings: Json | null | undefined,
): Promise<boolean> {
  if (isCenterFeaturesConfigured(centerId)) return true

  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const onboarding = (settings as Record<string, unknown>).onboarding
    if (
      onboarding &&
      typeof onboarding === 'object' &&
      !Array.isArray(onboarding) &&
      (onboarding as Record<string, unknown>).featuresConfigured === true
    ) {
      return true
    }
  }

  if (!centerCreatedAt) return false

  const { data, error } = await supabase
    .from('center_features')
    .select('updated_at')
    .eq('center_id', centerId)
    .in('feature_key', [...OPERATIONAL_FEATURE_KEYS])

  if (error || !data?.length) return false

  const createdAt = new Date(centerCreatedAt).getTime()
  const latestUpdate = Math.max(
    ...data.map((row) => new Date(String(row.updated_at)).getTime()),
  )

  // 가입 시 시드된 기능과 사용자가 저장한 시점(updated_at 갱신)을 구분
  return latestUpdate > createdAt + 5_000
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
    memberLoginResult,
  ] = await Promise.all([
    supabase
      .from('centers')
      .select('name, slug, logo_url, settings, created_at')
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
    supabase
      .from('member_login_logs')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId),
  ])

  if (centerResult.error) throw centerResult.error
  if (membersResult.error) throw membersResult.error
  if (schedulesResult.error) throw schedulesResult.error
  if (attendanceResult.error) throw attendanceResult.error
  if (completedSchedulesResult.error) throw completedSchedulesResult.error
  if (journalsResult.error) throw journalsResult.error
  if (alimtalkResult.error) throw alimtalkResult.error
  if (memberLoginResult.error) throw memberLoginResult.error

  const center = centerResult.data
  const centerInfoComplete =
    isCenterSettingsVisited(centerId) ||
    Boolean(center?.logo_url) ||
    hasSavedCenterSettings(center?.settings)

  const memberRows = membersResult.data ?? []
  const memberCount = memberRows.length
  const firstMemberId = memberRows[0]?.id ? String(memberRows[0].id) : null
  const operationalFeaturesConfigured = await hasOperationalFeaturesConfigured(
    centerId,
    center?.created_at ? String(center.created_at) : undefined,
    center?.settings,
  )

  return {
    centerId,
    centerName: center?.name ?? '',
    centerSlug: center?.slug ?? '',
    centerInfoComplete,
    operationalFeaturesConfigured,
    memberCount,
    firstMemberId,
    scheduleCount: schedulesResult.count ?? 0,
    attendanceLogCount: attendanceResult.count ?? 0,
    completedScheduleCount: completedSchedulesResult.count ?? 0,
    journalCount: journalsResult.count ?? 0,
    alimtalkSentCount: alimtalkResult.count ?? 0,
    memberLoginCount: memberLoginResult.count ?? 0,
    aiReportGenerated: isAiReportGenerated(centerId),
  }
}
