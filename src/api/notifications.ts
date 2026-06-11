import { supabase } from '../lib/supabase'
import type { MessageLog, MessageTemplateKey } from '../types/database'

export type NotificationTemplateKey = MessageTemplateKey

async function invokeNotification(
  templateKey: NotificationTemplateKey,
  memberId: string,
  extra?: { paymentId?: string; metadata?: Record<string, string | number> },
): Promise<void> {
  const triggerKey = import.meta.env.VITE_NOTIFICATION_TRIGGER_KEY
  if (!triggerKey) {
    console.info(
      `[notifications] VITE_NOTIFICATION_TRIGGER_KEY 없음 — ${templateKey} 발송 생략`,
    )
    return
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

    if (error) {
      console.warn(`[notifications] ${templateKey} 호출 실패:`, error.message)
      return
    }

    if (data && typeof data === 'object' && 'status' in data) {
      const status = (data as { status: string }).status
      if (status === 'failed') {
        console.warn(`[notifications] ${templateKey} 발송 실패:`, data)
      }
    }
  } catch (err) {
    console.warn(`[notifications] ${templateKey} 예외:`, err)
  }
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
  const { data, error } = await supabase
    .from('message_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function triggerRenewalReminders(): Promise<unknown> {
  const triggerKey = import.meta.env.VITE_NOTIFICATION_TRIGGER_KEY
  if (!triggerKey) {
    throw new Error('VITE_NOTIFICATION_TRIGGER_KEY가 설정되지 않았습니다.')
  }

  const { data, error } = await supabase.functions.invoke('renewal-reminders', {
    body: {},
    headers: {
      'x-mobel-notification-key': triggerKey,
    },
  })

  if (error) throw error
  return data
}
