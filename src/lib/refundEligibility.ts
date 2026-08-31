import { addDays } from '../utils/dates'
import type { PtPayment, PtSessionLog, PtSettlementOptions } from './recognitionRevenue'
import {
  isPtVatExcluded,
  paymentPerSessionBaseAmount,
} from './vatSettlement'

export type PrepaidBalanceSplit = {
  total: number
  refundable: number
  expired: number
}

type FifoPackage = {
  id: string
  sessions: number
  perSession: number
  remaining: number
  paidAt: string
  refundCutoff: string
}

function parseDateOnly(value: string): string {
  return String(value).slice(0, 10)
}

export function calcPtRefundCutoffDate(
  paidAt: string,
  sessions: number,
  daysPerSession: number,
): string {
  const paidDate = parseDateOnly(paidAt)
  const windowDays = Math.max(0, sessions) * Math.max(1, daysPerSession)
  return addDays(paidDate, windowDays)
}

function buildMemberFifo(
  payments: PtPayment[],
  daysPerSession: number,
  options?: PtSettlementOptions,
): FifoPackage[] {
  const excludeVat = isPtVatExcluded(options)
  return payments
    .filter((payment) => payment.sessions > 0 && payment.amount > 0)
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt))
    .map((payment) => ({
      id: payment.id,
      sessions: payment.sessions,
      perSession: paymentPerSessionBaseAmount(
        payment.amount,
        payment.sessions,
        excludeVat,
      ),
      remaining: payment.sessions,
      paidAt: payment.paidAt,
      refundCutoff: calcPtRefundCutoffDate(
        payment.paidAt,
        payment.sessions,
        daysPerSession,
      ),
    }))
}

function assignLogToFifo(packages: FifoPackage[], quantity: number): void {
  let left = quantity
  for (const pkg of packages) {
    if (left <= 0) break
    if (pkg.remaining <= 0) continue
    const use = Math.min(left, pkg.remaining)
    pkg.remaining -= use
    left -= use
  }
}

export function splitPtPrepaidByRefundWindow(
  payments: PtPayment[],
  logs: PtSessionLog[],
  daysPerSession: number,
  asOf: string,
  options?: PtSettlementOptions,
): PrepaidBalanceSplit {
  const asOfDate = parseDateOnly(asOf)
  const byMember = new Map<string, PtPayment[]>()

  for (const payment of payments) {
    const list = byMember.get(payment.memberId) ?? []
    list.push(payment)
    byMember.set(payment.memberId, list)
  }

  let total = 0
  let refundable = 0
  let expired = 0

  for (const [memberId, memberPayments] of byMember) {
    const fifo = buildMemberFifo(memberPayments, daysPerSession, options)
    const memberLogs = logs
      .filter((log) => log.memberId === memberId)
      .sort((a, b) => a.deductedAt.localeCompare(b.deductedAt))

    for (const log of memberLogs) {
      assignLogToFifo(fifo, log.quantity)
    }

    for (const pkg of fifo) {
      if (pkg.remaining <= 0) continue
      const value = pkg.perSession * pkg.remaining
      total += value
      if (asOfDate <= pkg.refundCutoff) {
        refundable += value
      } else {
        expired += value
      }
    }
  }

  return {
    total: Math.round(total),
    refundable: Math.round(refundable),
    expired: Math.round(expired),
  }
}

export type PeriodPassRefundInput = {
  id: string
  startsAt: string
  endsAt: string
  amount: number
  status: string
  paidAt: string | null
  durationDays: number
}

function centerPassRefundCutoff(
  pass: PeriodPassRefundInput,
  daysPerSession: number,
): string | null {
  const paidAt = pass.paidAt ? parseDateOnly(pass.paidAt) : parseDateOnly(pass.startsAt)
  const duration = pass.durationDays > 0 ? pass.durationDays : 0
  if (duration <= 0) return null
  return addDays(paidAt, duration * Math.max(1, daysPerSession))
}

export function splitCenterPassPrepaidByRefundWindow(
  passes: PeriodPassRefundInput[],
  daysPerSession: number,
  asOf: string,
): PrepaidBalanceSplit {
  const asOfDate = parseDateOnly(asOf)
  const today = asOfDate
  let total = 0
  let refundable = 0
  let expired = 0

  for (const pass of passes) {
    if (pass.status === 'cancelled' || pass.amount <= 0) continue
    if (pass.endsAt < today) continue

    const totalDays =
      pass.durationDays > 0
        ? pass.durationDays
        : Math.max(
            1,
            Math.round(
              (new Date(`${pass.endsAt}T12:00:00`).getTime() -
                new Date(`${pass.startsAt}T12:00:00`).getTime()) /
                86_400_000,
            ) + 1,
          )

    const remainingStart = today > pass.startsAt ? today : pass.startsAt
    const remainingDays = Math.max(
      0,
      Math.round(
        (new Date(`${pass.endsAt}T12:00:00`).getTime() -
          new Date(`${remainingStart}T12:00:00`).getTime()) /
          86_400_000,
      ) + 1,
    )
    if (remainingDays <= 0) continue

    const value = pass.amount * (remainingDays / totalDays)
    total += value

    const cutoff = centerPassRefundCutoff(
      { ...pass, durationDays: totalDays },
      daysPerSession,
    )
    if (!cutoff || asOfDate <= cutoff) {
      refundable += value
    } else {
      expired += value
    }
  }

  return {
    total: Math.round(total),
    refundable: Math.round(refundable),
    expired: Math.round(expired),
  }
}
