import { getPlatformSession } from '../lib/platformSession'
import { supabase } from '../lib/supabase'
import type { MessageCreditSummary } from '../types/messageCredits'

export type PlatformCenterCreditRow = {
  centerId: string
  centerName: string
  centerSlug: string
  notificationsEnabled: boolean
  credits: MessageCreditSummary
}

function parseSummaryFromCredits(raw: unknown): MessageCreditSummary {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      balance: 0,
      totalPurchased: 0,
      totalUsed: 0,
      monthUsed: 0,
      monthAlimtalk: 0,
      monthSms: 0,
      monthFailed: 0,
    }
  }
  const row = raw as Record<string, unknown>
  if (row.ok !== true) {
    return {
      balance: 0,
      totalPurchased: 0,
      totalUsed: 0,
      monthUsed: 0,
      monthAlimtalk: 0,
      monthSms: 0,
      monthFailed: 0,
    }
  }
  return {
    balance: Number(row.balance ?? 0),
    totalPurchased: Number(row.total_purchased ?? 0),
    totalUsed: Number(row.total_used ?? 0),
    monthUsed: Number(row.month_used ?? 0),
    monthAlimtalk: Number(row.month_alimtalk ?? 0),
    monthSms: Number(row.month_sms ?? 0),
    monthFailed: Number(row.month_failed ?? 0),
  }
}

export async function fetchPlatformCenterCredits(): Promise<
  PlatformCenterCreditRow[]
> {
  const session = getPlatformSession()
  if (!session?.token) {
    throw new Error('플랫폼 로그인이 필요합니다.')
  }

  const { data, error } = await supabase.rpc(
    'list_center_message_credits_for_platform',
    { p_session_token: session.token },
  )

  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []

  const row = data as Record<string, unknown>
  if (row.ok !== true || !Array.isArray(row.centers)) return []

  return row.centers
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const c = item as Record<string, unknown>
      const centerId = c.center_id != null ? String(c.center_id) : ''
      if (!centerId) return null
      return {
        centerId,
        centerName: c.center_name != null ? String(c.center_name) : '',
        centerSlug: c.center_slug != null ? String(c.center_slug) : '',
        notificationsEnabled: c.notifications_enabled === true,
        credits: parseSummaryFromCredits(c.credits),
      }
    })
    .filter((item): item is PlatformCenterCreditRow => item !== null)
}

export async function grantPlatformCenterCredits(
  centerId: string,
  amount: number,
  description?: string,
): Promise<void> {
  const session = getPlatformSession()
  if (!session?.token) {
    throw new Error('플랫폼 로그인이 필요합니다.')
  }

  const { data, error } = await supabase.rpc(
    'grant_center_message_credits_platform',
    {
      p_session_token: session.token,
      p_center_id: centerId,
      p_amount: amount,
      p_description: description ?? null,
    },
  )

  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('크레딧 지급에 실패했습니다.')
  }
  const row = data as Record<string, unknown>
  if (row.ok !== true) {
    throw new Error(
      row.error != null ? String(row.error) : '크레딧 지급에 실패했습니다.',
    )
  }
}
