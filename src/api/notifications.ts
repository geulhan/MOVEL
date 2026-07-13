import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { logPlatformActivity } from './platformActivity'
import { adminSessionHeaders, requireAdminSessionToken } from '../lib/notificationHeaders'
import type { MessageLog, MessageTemplateKey } from '../types/database'

export type NotificationTemplateKey = MessageTemplateKey

export type SendNotificationResult = {
  ok: boolean
  status: 'sent' | 'failed' | 'skipped'
  logId?: string
  error?: string
  skippedReason?: string
}

async function extractInvokeErrorDetail(
  error: { message?: string; context?: Response },
  result: SendNotificationResult | null,
): Promise<string> {
  if (result?.error) return result.error
  if (result?.status === 'failed') {
    return result.error ?? '알림 발송에 실패했습니다.'
  }

  try {
    const response = error.context
    if (response) {
      const body = (await response.clone().json()) as {
        error?: string
        status?: string
        skippedReason?: string
      }
      if (body.error) return body.error
      if (body.status === 'failed') {
        return body.error ?? '알림 발송에 실패했습니다.'
      }
      if (body.status === 'skipped') {
        return body.error ?? body.skippedReason ?? '발송이 생략되었습니다.'
      }
    }
  } catch {
    // ignore JSON parse errors
  }

  return error.message ?? '알림 발송에 실패했습니다.'
}

async function invokeNotification(
  templateKey: NotificationTemplateKey,
  memberId: string,
  extra?: { paymentId?: string; metadata?: Record<string, string | number> },
): Promise<SendNotificationResult | null> {
  const sessionHeaders = adminSessionHeaders()
  if (!sessionHeaders['x-session-token']) {
    console.info(
      `[notifications] 관리자 세션 없음 — ${templateKey} 발송 생략`,
    )
    return null
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        templateKey,
        memberId,
        paymentId: extra?.paymentId,
        metadata: extra?.metadata,
      },
      headers: sessionHeaders,
    })

    const result = data as SendNotificationResult | null

    if (error) {
      const detail = await extractInvokeErrorDetail(error, result)
      console.warn(`[notifications] ${templateKey} 호출 실패:`, detail)
      return {
        ok: false,
        status: 'failed',
        error: detail,
      }
    }

    if (result?.status === 'failed' || result?.status === 'skipped') {
      console.warn(`[notifications] ${templateKey} 발송 실패/생략:`, result)
    }

    if (result?.status === 'sent') {
      void getCurrentCenterId()
        .then((centerId) =>
          logPlatformActivity('message_sent', {
            centerId,
            metadata: { template_key: templateKey, member_id: memberId },
          }),
        )
        .catch(() => undefined)
    }

    return (
      result ?? {
        ok: false,
        status: 'failed',
        error: '알림 발송 응답이 비어 있습니다.',
      }
    )
  } catch (err) {
    console.warn(`[notifications] ${templateKey} 예외:`, err)
    return {
      ok: false,
      status: 'failed',
      error: err instanceof Error ? err.message : '알 수 없는 오류',
    }
  }
}

/** 관리자 수동 발송 (결과 반환) */
export async function sendNotification(
  templateKey: NotificationTemplateKey,
  memberId: string,
  extra?: { paymentId?: string; metadata?: Record<string, string | number> },
): Promise<SendNotificationResult> {
  requireAdminSessionToken()
  const result = await invokeNotification(templateKey, memberId, extra)
  if (!result) {
    throw new Error('로그인이 필요합니다. 다시 로그인한 뒤 발송해 주세요.')
  }
  return result
}

/** 회원 등록 완료 후 회원가입 안내 알림 */
export function notifyMemberSignupGuide(memberId: string): void {
  void invokeNotification('member_signup_guide', memberId)
}

/** @deprecated notifyMemberSignupGuide 사용 */
export function notifyMemberWelcome(memberId: string): void {
  notifyMemberSignupGuide(memberId)
}

/** 결제 기록 생성 후 결제 완료 알림 */
export function notifyPaymentDone(
  memberId: string,
  paymentId: string,
): void {
  void invokeNotification('payment_completed', memberId, { paymentId })
}

/** 예약 변경 알림 */
export function notifyScheduleChanged(
  memberId: string,
  scheduleId: string,
  metadata?: Record<string, string | number>,
): void {
  void invokeNotification('schedule_changed', memberId, {
    metadata: { schedule_id: scheduleId, ...metadata },
  })
}

/** 예약 취소 알림 */
export function notifyScheduleCancelled(
  memberId: string,
  scheduleId: string,
  metadata?: Record<string, string | number>,
): void {
  void invokeNotification('schedule_cancelled', memberId, {
    metadata: { schedule_id: scheduleId, ...metadata },
  })
}

/** 센터 가입 축하 알림 (센터 관리자 대상, 플랫폼 발송) */
export async function notifyCenterWelcome(
  centerId: string,
): Promise<SendNotificationResult | null> {
  const sessionHeaders = adminSessionHeaders()
  if (!sessionHeaders['x-session-token']) return null

  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: { templateKey: 'center_welcome', centerId },
    headers: sessionHeaders,
  })

  if (error) {
    console.warn('[notifications] center_welcome 호출 실패:', error.message)
    return { ok: false, status: 'failed', error: error.message }
  }
  return data as SendNotificationResult
}

/** 만보 인증 승인/반려 결과 알림 (템플릿 승인 후 발송) */
export function notifyStepVerificationResult(
  memberId: string,
  verificationId: string,
  approved: boolean,
  reason?: string | null,
): void {
  void invokeNotification('step_verification_result', memberId, {
    metadata: {
      verification_id: verificationId,
      approved: approved ? '1' : '0',
      reason: reason ?? '',
    },
  })
}

export type MessageLogWithMember = MessageLog & {
  member_name: string | null
}

export async function fetchMessageLogs(
  limit = 100,
  status?: MessageLog['status'] | 'all',
): Promise<MessageLogWithMember[]> {
  const centerId = await getCurrentCenterId()
  let query = supabase
    .from('message_logs')
    .select('*, members(name)')
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map((row) => {
    const members = row.members as { name?: string } | null
    const { members: _members, ...log } = row as MessageLog & {
      members?: { name?: string } | null
    }
    return {
      ...log,
      member_name: members?.name?.trim() || null,
    }
  })
}

async function invokeReminderFunction(functionName: string): Promise<unknown> {
  requireAdminSessionToken()
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: {},
    headers: adminSessionHeaders(),
  })

  if (error) throw error
  return data
}

export async function triggerRenewalReminders(): Promise<unknown> {
  return invokeReminderFunction('renewal-reminders')
}

export async function triggerPtReminders(): Promise<unknown> {
  return invokeReminderFunction('pt-reminders')
}

export async function triggerScheduleReminders(): Promise<unknown> {
  return invokeReminderFunction('schedule-reminders')
}

export async function triggerNotificationCron(): Promise<unknown> {
  return invokeReminderFunction('notification-cron')
}

export async function triggerWeeklyCenterReport(): Promise<unknown> {
  return invokeReminderFunction('weekly-center-report')
}
