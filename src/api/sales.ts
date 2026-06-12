import { supabase } from '../lib/supabase'

export type YearRevenue = {
  year: number
  revenue: number
  paymentCount: number
}

export type SalesStats = {
  monthRevenue: number
  monthPaymentCount: number
  yearlyRevenue: YearRevenue[]
  activeMemberCount: number
}

export type RecentPayment = {
  id: string
  member_name: string
  amount: number
  sessions: number
  paid_at: string
  note: string | null
}

function aggregateYearlyRevenue(
  payments: Array<{ amount: number; paid_at: string }>,
): YearRevenue[] {
  const totals = new Map<number, { revenue: number; paymentCount: number }>()

  for (const payment of payments) {
    const year = Number(String(payment.paid_at).slice(0, 4))
    if (!Number.isFinite(year) || year < 2000) continue

    const current = totals.get(year) ?? { revenue: 0, paymentCount: 0 }
    current.revenue += Number(payment.amount)
    current.paymentCount += 1
    totals.set(year, current)
  }

  const currentYear = new Date().getFullYear()
  if (!totals.has(currentYear)) {
    totals.set(currentYear, { revenue: 0, paymentCount: 0 })
  }

  return [...totals.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, data]) => ({
      year,
      revenue: data.revenue,
      paymentCount: data.paymentCount,
    }))
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
  const monthRows = all.filter((p) => String(p.paid_at).startsWith(monthPrefix))
  const monthRevenue = monthRows.reduce((s, p) => s + Number(p.amount), 0)

  return {
    monthRevenue,
    monthPaymentCount: monthRows.length,
    yearlyRevenue: aggregateYearlyRevenue(all),
    activeMemberCount: members?.length ?? 0,
  }
}

export function getYearRevenue(
  yearlyRevenue: YearRevenue[],
  year: number,
): YearRevenue {
  return (
    yearlyRevenue.find((row) => row.year === year) ?? {
      year,
      revenue: 0,
      paymentCount: 0,
    }
  )
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
