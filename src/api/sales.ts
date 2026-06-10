import { supabase } from '../lib/supabase'

export type SalesStats = {
  totalRevenue: number
  monthRevenue: number
  monthPaymentCount: number
  activeMemberCount: number
  avgPerMember: number
}

export type RecentPayment = {
  id: string
  member_name: string
  amount: number
  sessions: number
  paid_at: string
  note: string | null
}

export async function fetchSalesStats(): Promise<SalesStats> {
  const { data: payments, error: payError } = await supabase
    .from('payment_history')
    .select('amount, paid_at')

  if (payError) throw payError

  const { data: members, error: memError } = await supabase
    .from('members')
    .select('status')
    .eq('status', 'active')

  if (memError) throw memError

  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const all = payments ?? []
  const totalRevenue = all.reduce((s, p) => s + Number(p.amount), 0)
  const monthRows = all.filter((p) => String(p.paid_at).startsWith(monthPrefix))
  const monthRevenue = monthRows.reduce((s, p) => s + Number(p.amount), 0)

  const activeCount = members?.length ?? 0

  return {
    totalRevenue,
    monthRevenue,
    monthPaymentCount: monthRows.length,
    activeMemberCount: activeCount,
    avgPerMember: activeCount > 0 ? Math.round(totalRevenue / activeCount) : 0,
  }
}

export async function fetchRecentPayments(limit = 8): Promise<RecentPayment[]> {
  const { data, error } = await supabase
    .from('payment_history')
    .select('id, amount, sessions, paid_at, note, member_id')
    .order('paid_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const payments = data ?? []
  const memberIds = [...new Set(payments.map((p) => p.member_id))]

  const nameById = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from('members')
      .select('id, name')
      .in('id', memberIds)

    for (const member of members ?? []) {
      nameById.set(member.id, member.name)
    }
  }

  return payments.map((p) => ({
    id: p.id,
    member_name: nameById.get(p.member_id) ?? '-',
    amount: Number(p.amount),
    sessions: p.sessions,
    paid_at: p.paid_at,
    note: p.note,
  }))
}

export function currentMonthLabel(): string {
  const now = new Date()
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`
}
