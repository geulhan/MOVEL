import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { logPlatformActivity } from './platformActivity'
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
      }
      if (body.error) return body.error
      if (body.status === 'failed' && typeof body.error === 'string') {
        return body.error
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
  const triggerKey = import.meta.env.VITE_NOTIFICATION_TRIGGER_KEY
  if (!triggerKey) {
    console.info(
      `[notifications] VITE_NOTIFICATION_TRIGGER_KEY 없음 — ${templateKey} 발송 생략`,
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
      headers: {
        'x-mobel-notification-key': triggerKey,
      },
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

    if (result?.status === 'failed') {
      console.warn(`[notifications] ${templateKey} 발송 실패:`, data)
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
  const result = await invokeNotification(templateKey, memberId, extra)
  if (!result) {
    throw new Error('VITE_NOTIFICATION_TRIGGER_KEY가 설정되지 않았습니다.')
  }
  return result
}

/** 회원 등록 후 환영 알림 (실패해도 회원 등록은 유지) */
export function notifyMemberWelcome(memberId: string): void {
  void invokeNotification('welcome', memberId)
}

/** 결제 기록 생성 후 결제 완료 알림 */
export function notifyPaymentDone(
  memberId: string,
  paymentId: string,
): void {
  void invokeNotification('payment_done', memberId, { paymentId })
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

export async function fetchMessageLogs(limit = 100): Promise<MessageLog[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('message_logs')
    .select('*')
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

async function invokeReminderFunction(functionName: string): Promise<unknown> {
  const triggerKey = import.meta.env.VITE_NOTIFICATION_TRIGGER_KEY
  if (!triggerKey) {
    throw new Error('VITE_NOTIFICATION_TRIGGER_KEY가 설정되지 않았습니다.')
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: {},
    headers: {
      'x-mobel-notification-key': triggerKey,
    },
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
