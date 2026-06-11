import { fetchMembers, formatDate, todayDateString } from './members'
import { sendNotification, type SendNotificationResult } from './notifications'
import { supabase } from '../lib/supabase'
import type { Member, PaymentHistory } from '../types/database'
import { isExpiringSoon, isRenewalTarget } from '../utils/renewal'

export type MessageCampaignKind = 'welcome' | 'payment_done' | 'renewal'

export type WelcomeTarget = {
  member: Member
}

export type PaymentTarget = {
  member: Member
  payment: PaymentHistory
}

export type RenewalTarget = {
  member: Member
  daysLeft: number
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00+09:00`)
  const end = new Date(`${to}T12:00:00+09:00`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

async function fetchNotifiedMemberIds(
  templateKey: MessageCampaignKind,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('message_logs')
    .select('member_id')
    .eq('template_key', templateKey)
    .in('status', ['sent', 'skipped'])

  if (error) throw error
  return new Set(
    (data ?? [])
      .map((row) => row.member_id)
      .filter((id): id is string => Boolean(id)),
  )
}

async function fetchNotifiedPaymentIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('message_logs')
    .select('metadata')
    .eq('template_key', 'payment_done')
    .in('status', ['sent', 'skipped'])

  if (error) throw error

  const ids = new Set<string>()
  for (const row of data ?? []) {
    const paymentId = (row.metadata as { payment_id?: string } | null)?.payment_id
    if (paymentId) ids.add(paymentId)
  }
  return ids
}

export async function fetchWelcomeTargets(): Promise<WelcomeTarget[]> {
  const [members, notified] = await Promise.all([
    fetchMembers(),
    fetchNotifiedMemberIds('welcome'),
  ])

  return members
    .filter((member) => member.status !== 'terminated' && !notified.has(member.id))
    .map((member) => ({ member }))
}

export async function fetchPaymentTargets(): Promise<PaymentTarget[]> {
  const [members, paymentsResult, notifiedPaymentIds] = await Promise.all([
    fetchMembers(),
    supabase.from('payment_history').select('*'),
    fetchNotifiedPaymentIds(),
  ])

  if (paymentsResult.error) throw paymentsResult.error

  const sortedPayments = [...(paymentsResult.data ?? [])].sort((a, b) => {
    const paidDiff = b.paid_at.localeCompare(a.paid_at)
    if (paidDiff !== 0) return paidDiff
    return b.created_at.localeCompare(a.created_at)
  })

  const latestPaymentByMember = new Map<string, PaymentHistory>()
  for (const payment of sortedPayments) {
    if (!latestPaymentByMember.has(payment.member_id)) {
      latestPaymentByMember.set(payment.member_id, payment)
    }
  }

  return members
    .filter((member) => member.status !== 'terminated' && member.total_sessions > 0)
    .map((member) => {
      const payment = latestPaymentByMember.get(member.id)
      if (!payment || notifiedPaymentIds.has(payment.id)) return null
      return { member, payment }
    })
    .filter((row): row is PaymentTarget => row !== null)
}

export async function fetchRenewalTargets(): Promise<RenewalTarget[]> {
  const members = await fetchMembers()
  const today = todayDateString()

  return members
    .filter(
      (member) =>
        member.status !== 'terminated' &&
        member.total_sessions > 0 &&
        (isRenewalTarget(member) || isExpiringSoon(member.expires_at, member.status)),
    )
    .map((member) => {
      const expiresAt = member.expires_at?.split('T')[0]
      const daysLeft = expiresAt ? Math.max(0, daysBetween(today, expiresAt)) : 0
      return { member, daysLeft }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export async function sendWelcomeMessage(
  memberId: string,
): Promise<SendNotificationResult> {
  return sendNotification('welcome', memberId)
}

export async function sendPaymentMessage(
  memberId: string,
  paymentId: string,
): Promise<SendNotificationResult> {
  return sendNotification('payment_done', memberId, { paymentId })
}

export async function sendRenewalMessage(
  memberId: string,
  daysLeft: number,
): Promise<SendNotificationResult> {
  return sendNotification('renewal', memberId, {
    metadata: { days_left: daysLeft },
  })
}

export function formatPaymentSummary(payment: PaymentHistory): string {
  return `${formatDate(payment.paid_at)} · ${payment.sessions}회 · ${payment.amount.toLocaleString('ko-KR')}원`
}

export function formatRenewalSummary(member: Member, daysLeft: number): string {
  const expiresLabel = member.expires_at ? formatDate(member.expires_at) : '-'
  return `만료 ${expiresLabel} (D-${daysLeft}) · 잔여 ${member.remaining_sessions}회`
}

export function renewalReminderLabel(daysLeft: number): string {
  if (daysLeft <= 1) return 'D-1'
  if (daysLeft <= 3) return 'D-3'
  if (daysLeft <= 7) return 'D-7'
  return `D-${daysLeft}`
}

export function isRenewalCronDay(daysLeft: number): boolean {
  return daysLeft === 7 || daysLeft === 3 || daysLeft === 1
}

export function suggestRenewalDaysLeft(daysLeft: number): number {
  if (daysLeft <= 1) return 1
  if (daysLeft <= 3) return 3
  if (daysLeft <= 7) return 7
  return daysLeft
}
