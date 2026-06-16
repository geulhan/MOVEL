import { getAdminSession } from '../lib/adminSession'
import { supabase } from '../lib/supabase'
import {
  parseCenterMessageDashboard,
  type CenterMessageDashboard,
} from '../types/messageCredits'

export async function fetchCenterMessageDashboard(): Promise<CenterMessageDashboard> {
  const session = getAdminSession()
  if (!session?.token) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data, error } = await supabase.rpc('get_center_message_dashboard', {
    p_session_token: session.token,
  })

  if (error) throw error
  return parseCenterMessageDashboard(data)
}

export async function updateCenterNotificationsEnabled(
  enabled: boolean,
): Promise<CenterMessageDashboard> {
  const session = getAdminSession()
  if (!session?.token) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data, error } = await supabase.rpc(
    'update_center_notifications_enabled',
    {
      p_session_token: session.token,
      p_enabled: enabled,
    },
  )

  if (error) throw error
  return parseCenterMessageDashboard(data)
}

export const INSUFFICIENT_CREDITS_MESSAGE = '메시지 크레딧이 부족합니다.'

export function isInsufficientCreditsError(message: string): boolean {
  return message.includes('크레딧이 부족')
}
