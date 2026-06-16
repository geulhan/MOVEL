import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export type CreditConsumeResult =
  | { ok: true; balance: number; consumed: number }
  | {
      ok: false
      error: string
      message?: string
      balance?: number
    }

export async function isCenterNotificationsEnabled(
  supabase: SupabaseClient,
  centerId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_center_notifications_enabled', {
    p_center_id: centerId,
  })
  if (error) return false
  return data === true
}

export async function tryConsumeMessageCredits(
  supabase: SupabaseClient,
  centerId: string,
  amount: number,
  description: string,
  metadata: Record<string, unknown> = {},
): Promise<CreditConsumeResult> {
  const { data, error } = await supabase.rpc('try_consume_message_credits', {
    p_center_id: centerId,
    p_amount: amount,
    p_description: description,
    p_metadata: metadata,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Invalid credit response' }
  }

  const row = data as Record<string, unknown>
  if (row.ok === true) {
    return {
      ok: true,
      balance: Number(row.balance ?? 0),
      consumed: Number(row.consumed ?? amount),
    }
  }

  return {
    ok: false,
    error: String(row.error ?? 'insufficient_credits'),
    message:
      row.message != null
        ? String(row.message)
        : '메시지 크레딧이 부족합니다.',
    balance: row.balance != null ? Number(row.balance) : undefined,
  }
}

/** 알림톡 1건 = 1크레딧, 문자 1건 = 1크레딧 (대체문자 추가 차감 확장 가능) */
export function creditsForChannel(channel: 'alimtalk' | 'sms'): number {
  return channel === 'sms' ? 1 : 1
}
