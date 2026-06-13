import { getPersistedItem, setPersistedItem } from '../lib/browserStorage'
import { resolveCenterIdForMember } from '../lib/center'
import { detectDeviceType } from '../lib/deviceType'
import { supabase } from '../lib/supabase'

function sessionVisitKey(memberId: string): string {
  return `mobel_login_log_date_${memberId}`
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

async function insertLoginLogDirect(memberId: string, deviceType: string): Promise<void> {
  const centerId = await resolveCenterIdForMember(memberId)
  const { error } = await supabase.from('member_login_logs').insert({
    center_id: centerId,
    member_id: memberId,
    login_at: new Date().toISOString(),
    device_type: deviceType,
  })
  if (error) throw error
}

/** 회원 로그인/앱 방문 시 호출 (실패해도 기존 흐름에 영향 없음) */
export function logMemberLogin(memberId: string): void {
  void (async () => {
    try {
      const deviceType = detectDeviceType()
      const { error } = await supabase.rpc('log_member_session_visit', {
        p_member_id: memberId,
        p_device_type: deviceType,
      })
      if (!error) return

      const msg = error.message ?? ''
      if (msg.includes('log_member_session_visit')) {
        await insertLoginLogDirect(memberId, deviceType)
        return
      }

      console.warn('[member_login_logs]', error.message)
    } catch (err) {
      console.warn('[member_login_logs]', err)
    }
  })()
}

/**
 * 저장된 세션으로 앱 진입 시 하루 1회 방문 기록
 * (명시적 로그인 없이 재방문한 회원도 앱 사용률에 반영)
 */
export function logMemberSessionVisit(memberId: string): void {
  const today = todayDateKey()
  if (getPersistedItem(sessionVisitKey(memberId)) === today) return
  setPersistedItem(sessionVisitKey(memberId), today)
  logMemberLogin(memberId)
}
