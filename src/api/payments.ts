import { supabase } from '../lib/supabase'
import type { PaymentHistory } from '../types/database'

export async function updatePayment(
  paymentId: string,
  memberId: string,
  input: { paid_at: string; amount: number },
): Promise<PaymentHistory> {
  if (!input.paid_at) {
    throw new Error('결제일을 입력해 주세요.')
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error('결제 금액을 올바르게 입력해 주세요.')
  }

  const { data, error } = await supabase
    .from('payment_history')
    .update({
      paid_at: input.paid_at,
      amount: input.amount,
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) throw error

  await syncMemberPaymentTotal(memberId)
  return data
}

async function syncMemberPaymentTotal(memberId: string): Promise<void> {
  const { data, error } = await supabase
    .from('payment_history')
    .select('amount')
    .eq('member_id', memberId)

  if (error) throw error

  const total = (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)

  const { error: updateError } = await supabase
    .from('members')
    .update({ payment_amount: total })
    .eq('id', memberId)

  if (updateError) throw updateError
}
