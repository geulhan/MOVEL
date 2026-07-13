export type PeriodPass = {
  id: string
  startsAt: string
  endsAt: string
  amount: number
  status: string
}

export type PtPayment = {
  id: string
  memberId: string
  amount: number
  sessions: number
  paidAt: string
}

export type PtSessionLog = {
  id: string
  memberId: string
  deductedAt: string
  quantity: number
}

export type MemberTrainer = {
  memberId: string
  trainerId: string | null
}

function parseDateOnly(value: string): Date {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`)
}

function daysBetweenInclusive(start: string, end: string): number {
  const a = parseDateOnly(start)
  const b = parseDateOnly(end)
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1)
}

export function monthBounds(year: number, month: number): {
  start: string
  end: string
  prefix: string
} {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end, prefix: `${year}-${String(month).padStart(2, '0')}` }
}

function overlapDays(
  rangeStart: string,
  rangeEnd: string,
  monthStart: string,
  monthEnd: string,
): number {
  const start = rangeStart > monthStart ? rangeStart : monthStart
  const end = rangeEnd < monthEnd ? rangeEnd : monthEnd
  if (start > end) return 0
  return daysBetweenInclusive(start, end)
}

export function recognizeCenterPassRevenue(
  passes: PeriodPass[],
  year: number,
  month: number,
): number {
  const { start, end } = monthBounds(year, month)
  let total = 0

  for (const pass of passes) {
    if (pass.status === 'cancelled' || pass.amount <= 0) continue
    const totalDays = daysBetweenInclusive(pass.startsAt, pass.endsAt)
    if (totalDays <= 0) continue
    const days = overlapDays(pass.startsAt, pass.endsAt, start, end)
    if (days <= 0) continue
    total += pass.amount * (days / totalDays)
  }

  return Math.round(total)
}

export function centerPassPrepaidBalance(passes: PeriodPass[], asOf: string): number {
  const today = asOf.slice(0, 10)
  let total = 0

  for (const pass of passes) {
    if (pass.status === 'cancelled' || pass.amount <= 0) continue
    if (pass.endsAt < today) continue
    const totalDays = daysBetweenInclusive(pass.startsAt, pass.endsAt)
    if (totalDays <= 0) continue
    const remainingStart = today > pass.startsAt ? today : pass.startsAt
    const remainingDays = overlapDays(remainingStart, pass.endsAt, remainingStart, pass.endsAt)
    if (remainingDays <= 0) continue
    total += pass.amount * (remainingDays / totalDays)
  }

  return Math.round(total)
}

type FifoPackage = {
  id: string
  sessions: number
  perSession: number
  remaining: number
}

function buildMemberFifo(payments: PtPayment[]): FifoPackage[] {
  return payments
    .filter((p) => p.sessions > 0 && p.amount > 0)
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt))
    .map((p) => ({
      id: p.id,
      sessions: p.sessions,
      perSession: p.amount / p.sessions,
      remaining: p.sessions,
    }))
}

/** 결제 건별 FIFO로 각 session_log의 회당 단가를 계산 */
export function buildSessionLogUnitPriceMap(
  payments: PtPayment[],
  logs: PtSessionLog[],
): Map<string, number> {
  const paymentsByMember = new Map<string, PtPayment[]>()
  for (const payment of payments) {
    if (payment.sessions <= 0 || payment.amount <= 0) continue
    const list = paymentsByMember.get(payment.memberId) ?? []
    list.push(payment)
    paymentsByMember.set(payment.memberId, list)
  }

  const logsByMember = new Map<string, PtSessionLog[]>()
  for (const log of logs) {
    const list = logsByMember.get(log.memberId) ?? []
    list.push(log)
    logsByMember.set(log.memberId, list)
  }

  const priceByLogId = new Map<string, number>()

  for (const [memberId, memberLogs] of logsByMember) {
    const fifo = buildMemberFifo(paymentsByMember.get(memberId) ?? [])
    const sorted = [...memberLogs].sort((a, b) =>
      a.deductedAt.localeCompare(b.deductedAt),
    )

    for (const log of sorted) {
      const chunks = assignLogToFifo(fifo, log.quantity)
      if (chunks.length === 0) {
        priceByLogId.set(log.id, 0)
        continue
      }
      const gross = chunks.reduce(
        (sum, chunk) => sum + chunk.perSession * chunk.quantity,
        0,
      )
      priceByLogId.set(log.id, Math.round(gross / log.quantity))
    }
  }

  return priceByLogId
}

/** 다음 차감 시 적용될 회당 단가 (FIFO) */
export function memberNextSessionUnitPrice(
  payments: PtPayment[],
  logs: PtSessionLog[],
  memberId: string,
): number {
  const memberPayments = payments.filter(
    (payment) => payment.memberId === memberId && payment.sessions > 0 && payment.amount > 0,
  )
  const fifo = buildMemberFifo(memberPayments)
  const memberLogs = logs
    .filter((log) => log.memberId === memberId)
    .sort((a, b) => a.deductedAt.localeCompare(b.deductedAt))

  for (const log of memberLogs) {
    assignLogToFifo(fifo, log.quantity)
  }

  for (const pkg of fifo) {
    if (pkg.remaining > 0) return Math.round(pkg.perSession)
  }

  return 0
}

function assignLogToFifo(
  packages: FifoPackage[],
  quantity: number,
): Array<{ perSession: number; quantity: number }> {
  const chunks: Array<{ perSession: number; quantity: number }> = []
  let left = quantity

  for (const pkg of packages) {
    if (left <= 0) break
    if (pkg.remaining <= 0) continue
    const use = Math.min(left, pkg.remaining)
    pkg.remaining -= use
    left -= use
    chunks.push({ perSession: pkg.perSession, quantity: use })
  }

  return chunks
}

export function recognizePtRevenue(
  payments: PtPayment[],
  logs: PtSessionLog[],
  year: number,
  month: number,
): number {
  const { start, end } = monthBounds(year, month)
  return Math.round(recognizePtRevenueDetailed(payments, logs, start, end))
}

function recognizePtRevenueDetailed(
  payments: PtPayment[],
  logs: PtSessionLog[],
  monthStart: string,
  monthEnd: string,
): number {
  const byMember = new Map<string, PtPayment[]>()
  for (const payment of payments) {
    const list = byMember.get(payment.memberId) ?? []
    list.push(payment)
    byMember.set(payment.memberId, list)
  }

  let total = 0

  for (const [memberId, memberPayments] of byMember) {
    const fifo = buildMemberFifo(memberPayments)
    const memberLogs = logs
      .filter((log) => log.memberId === memberId)
      .sort((a, b) => a.deductedAt.localeCompare(b.deductedAt))

    for (const log of memberLogs) {
      const logDate = String(log.deductedAt).slice(0, 10)
      const chunks = assignLogToFifo(fifo, log.quantity)
      if (logDate < monthStart || logDate > monthEnd) continue
      for (const chunk of chunks) {
        total += chunk.perSession * chunk.quantity
      }
    }
  }

  return total
}

export function ptPrepaidBalance(payments: PtPayment[], logs: PtSessionLog[]): number {
  const byMember = new Map<string, PtPayment[]>()
  for (const payment of payments) {
    const list = byMember.get(payment.memberId) ?? []
    list.push(payment)
    byMember.set(payment.memberId, list)
  }

  let total = 0

  for (const [memberId, memberPayments] of byMember) {
    const fifo = buildMemberFifo(memberPayments)
    const memberLogs = logs
      .filter((log) => log.memberId === memberId)
      .sort((a, b) => a.deductedAt.localeCompare(b.deductedAt))

    for (const log of memberLogs) {
      assignLogToFifo(fifo, log.quantity)
    }

    for (const pkg of fifo) {
      if (pkg.remaining > 0) {
        total += pkg.perSession * pkg.remaining
      }
    }
  }

  return Math.round(total)
}

export function countPtSessionsInMonth(
  logs: PtSessionLog[],
  memberIds: Set<string>,
  year: number,
  month: number,
): number {
  const { prefix } = monthBounds(year, month)
  return logs
    .filter(
      (log) =>
        memberIds.has(log.memberId) && String(log.deductedAt).startsWith(prefix),
    )
    .reduce((sum, log) => sum + log.quantity, 0)
}

export function ptRecognizedByTrainer(
  payments: PtPayment[],
  logs: PtSessionLog[],
  members: MemberTrainer[],
  trainerId: string,
  year: number,
  month: number,
): number {
  const memberIds = new Set(
    members.filter((m) => m.trainerId === trainerId).map((m) => m.memberId),
  )
  if (memberIds.size === 0) return 0

  const filteredPayments = payments.filter((p) => memberIds.has(p.memberId))
  const filteredLogs = logs.filter((l) => memberIds.has(l.memberId))
  const { start, end } = monthBounds(year, month)
  return Math.round(
    recognizePtRevenueDetailed(filteredPayments, filteredLogs, start, end),
  )
}

export function healthGradeFromScore(score: number): import('../types/businessAnalytics').CenterHealthGrade {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}
