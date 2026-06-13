import { resolveCenterIdForMember } from '../lib/center'
import { detectDeviceType } from '../lib/deviceType'
import { supabase } from '../lib/supabase'

/** 회원 로그인 성공 시 호출 (실패해도 로그인 흐름에 영향 없음) */
export function logMemberLogin(memberId: string): void {
  void (async () => {
    try {
      const centerId = await resolveCenterIdForMember(memberId)
      const { error } = await supabase.from('member_login_logs').insert({
        center_id: centerId,
        member_id: memberId,
        login_at: new Date().toISOString(),
        device_type: detectDeviceType(),
      })
      if (error) console.warn('[member_login_logs]', error.message)
    } catch (err) {
      console.warn('[member_login_logs]', err)
    }
  })()
}
