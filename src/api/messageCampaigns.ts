import { getCurrentCenterId } from '../lib/center'
import { fetchMembers, formatDate, todayDateString } from './members'
import { sendNotification, type SendNotificationResult } from './notifications'
import { supabase } from '../lib/supabase'
import type { Member, MessageTemplateKey, PaymentHistory } from '../types/database'
import { resolveMembershipExpireTemplateKey } from '../constants/alimtalkTemplates'
import { isExpiringSoon, isRenewalTarget } from '../utils/renewal'

export type MessageCampaignKind =
  | 'welcome'
  | 'payment_done'
  | 'renewal'
  | 'pt_reminder'

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
  notifyTier: number
  alreadySent: boolean
}

export type PtReminderTarget = {
  member: Member
  scheduleId: string
  scheduledAt: string
  trainerName: string
}

const PT_REMINDER_HOURS = 24
const PT_REMINDER_WINDOW_HOURS = 1

type ScheduleQueryRow = {
  id: string
  member_id: string
  scheduled_at: string
  trainer_id: string | null
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00+09:00`)
  const end = new Date(`${to}T12:00:00+09:00`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

async function fetchNotifiedMemberIds(
  templateKey: MessageTemplateKey,
): Promise<Set<string>> {
  const centerId = await getCurrentCenterId()
  const keys =
    templateKey === 'welcome'
      ? (['welcome', 'member_signup_guide', 'member_welcome'] as const)
      : templateKey === 'payment_done'
        ? (['payment_done', 'payment_completed'] as const)
        : ([templateKey] as const)

  const { data, error } = await supabase
    .from('message_logs')
    .select('member_id')
    .eq('center_id', centerId)
    .in('template_key', [...keys])
    .in('status', ['sent', 'skipped'])

  if (error) throw error
  return new Set(
    (data ?? [])
      .map((row) => row.member_id)
      .filter((id): id is string => Boolean(id)),
  )
}

async function fetchRenewalTierState(): Promise<{
  sentKeys: Set<string>
  dismissedKeys: Set<string>
}> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('message_logs')
    .select('member_id, template_key, metadata, status')
    .eq('center_id', centerId)
    .in('template_key', [
      'renewal',
      'membership_expire_14',
      'membership_expire_7',
      'membership_expire_today',
    ])
    .in('status', ['sent', 'skipped'])

  if (error) throw error

  const sentKeys = new Set<string>()
  const dismissedKeys = new Set<string>()
  for (const row of data ?? []) {
    if (!row.member_id) continue
    const metadata = row.metadata as {
      days_left?: number
      expire_date?: string
      skipped_reason?: string
    } | null
    let daysLeft = metadata?.days_left
    if (daysLeft == null) {
      const templateKey = String(row.template_key ?? '')
      if (templateKey === 'membership_expire_14') daysLeft = 14
      else if (templateKey === 'membership_expire_7') daysLeft = 7
      else if (templateKey === 'membership_expire_today') daysLeft = 0
    }
    if (daysLeft == null) continue
    const key = `${row.member_id}:${daysLeft}`
    if (row.status === 'sent') {
      sentKeys.add(key)
      continue
    }
    if (metadata?.skipped_reason === 'manual_dismiss') {
      dismissedKeys.add(key)
    }
  }
  return { sentKeys, dismissedKeys }
}

async function fetchNotifiedPaymentIds(): Promise<Set<string>> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('message_logs')
    .select('metadata')
    .eq('center_id', centerId)
    .in('template_key', ['payment_done', 'payment_completed'])
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
  const centerId = await getCurrentCenterId()
  const [members, paymentsResult, notifiedPaymentIds] = await Promise.all([
    fetchMembers(),
    supabase.from('payment_history').select('*').eq('center_id', centerId),
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

async function buildRenewalTargets(): Promise<RenewalTarget[]> {
  const [members, { sentKeys, dismissedKeys }] = await Promise.all([
    fetchMembers(),
    fetchRenewalTierState(),
  ])
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
      const notifyTier = suggestRenewalDaysLeft(daysLeft)
      const tierKey = `${member.id}:${notifyTier}`
      return {
        member,
        daysLeft,
        notifyTier,
        alreadySent: sentKeys.has(tierKey),
        tierKey,
      }
    })
    .filter((row) => !dismissedKeys.has(row.tierKey))
    .map(({ tierKey: _ignored, ...row }) => row)
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export async function fetchRenewalTargets(): Promise<RenewalTarget[]> {
  return buildRenewalTargets()
}

async function fetchNotifiedPtScheduleIds(): Promise<Set<string>> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('message_logs')
    .select('metadata')
    .eq('center_id', centerId)
    .in('template_key', ['pt_reminder', 'schedule_reminder'])
    .in('status', ['sent', 'skipped'])

  if (error) throw error

  const ids = new Set<string>()
  for (const row of data ?? []) {
    const scheduleId = (row.metadata as { schedule_id?: string } | null)?.schedule_id
    if (scheduleId) ids.add(scheduleId)
  }
  return ids
}

export function formatScheduledAtKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export async function fetchPtReminderPendingTargets(): Promise<PtReminderTarget[]> {
  const centerId = await getCurrentCenterId()
  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  const maxAhead =
    PT_REMINDER_HOURS * hourMs + PT_REMINDER_WINDOW_HOURS * hourMs
  const windowStart = new Date(now).toISOString()
  const windowEnd = new Date(now + maxAhead).toISOString()

  const [members, schedulesResult, trainersResult, notifiedIds] =
    await Promise.all([
      fetchMembers(),
      supabase
        .from('pt_schedules')
        .select('id, member_id, scheduled_at, trainer_id')
        .eq('center_id', centerId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', windowStart)
        .lte('scheduled_at', windowEnd),
      supabase.from('trainers').select('id, name').eq('center_id', centerId),
      fetchNotifiedPtScheduleIds(),
    ])

  if (schedulesResult.error) throw schedulesResult.error
  if (trainersResult.error) throw trainersResult.error

  const memberById = new Map(members.map((member) => [member.id, member]))
  const trainerById = new Map(
    (trainersResult.data ?? []).map((trainer) => [trainer.id, trainer.name]),
  )

  return ((schedulesResult.data ?? []) as ScheduleQueryRow[])
    .filter((schedule) => !notifiedIds.has(schedule.id))
    .map((schedule) => {
      const member = memberById.get(schedule.member_id)
      if (!member || member.status === 'terminated') return null
      const trainerName =
        (schedule.trainer_id
          ? trainerById.get(schedule.trainer_id)
          : null) ??
        member.trainer_name ??
        ''
      return {
        member,
        scheduleId: schedule.id,
        scheduledAt: schedule.scheduled_at,
        trainerName,
      }
    })
    .filter((row): row is PtReminderTarget => row !== null)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
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
  const templateKey = resolveMembershipExpireTemplateKey(daysLeft)
  return sendNotification(templateKey, memberId, {
    metadata: { days_left: daysLeft },
  })
}

export async function sendPtReminderMessage(
  target: Pick<PtReminderTarget, 'member' | 'scheduleId' | 'scheduledAt' | 'trainerName'>,
): Promise<SendNotificationResult> {
  return sendNotification('schedule_reminder', target.member.id, {
    metadata: {
      schedule_id: target.scheduleId,
      scheduled_at: target.scheduledAt,
      schedule_date: formatScheduledAtKst(target.scheduledAt),
      trainer_name: target.trainerName,
      class_name: 'PT',
    },
  })
}

/** 목록에서 제외 (발송 없이 skipped 로그 기록) */
async function insertSkippedMessageLogs(
  rows: Array<{
    member: Member
    templateKey: MessageTemplateKey
    metadata?: Record<string, string | number>
  }>,
): Promise<void> {
  if (rows.length === 0) return

  const centerId = await getCurrentCenterId()
  const { error } = await supabase.from('message_logs').insert(
    rows.map((row) => ({
      center_id: centerId,
      member_id: row.member.id,
      phone: row.member.phone,
      template_key: row.templateKey,
      channel: 'skipped' as const,
      status: 'skipped' as const,
      metadata: {
        skipped_reason: 'manual_dismiss',
        ...row.metadata,
      },
      error_message: '관리자가 목록에서 제외',
    })),
  )

  if (error) throw error
}

export async function dismissWelcomeTargets(
  targets: Pick<WelcomeTarget, 'member'>[],
): Promise<void> {
  await insertSkippedMessageLogs(
    targets.map((target) => ({
      member: target.member,
      templateKey: 'welcome' as const,
    })),
  )
}

export async function dismissPaymentTargets(
  targets: Pick<PaymentTarget, 'member' | 'payment'>[],
): Promise<void> {
  await insertSkippedMessageLogs(
    targets.map((target) => ({
      member: target.member,
      templateKey: 'payment_done' as const,
      metadata: { payment_id: target.payment.id },
    })),
  )
}

export async function dismissRenewalTargets(
  targets: Pick<RenewalTarget, 'member' | 'notifyTier'>[],
): Promise<void> {
  await insertSkippedMessageLogs(
    targets.map((target) => ({
      member: target.member,
      templateKey: 'renewal' as const,
      metadata: { days_left: target.notifyTier },
    })),
  )
}

/** PT 리마인더 목록에서 선택 건 제외 (발송 없이 skipped 로그 기록) */
export async function dismissPtReminderTargets(
  targets: Pick<PtReminderTarget, 'member' | 'scheduleId'>[],
): Promise<void> {
  await insertSkippedMessageLogs(
    targets.map((target) => ({
      member: target.member,
      templateKey: 'schedule_reminder' as const,
      metadata: { schedule_id: target.scheduleId },
    })),
  )
}

export function formatPtReminderSummary(target: PtReminderTarget): string {
  const trainer = target.trainerName.trim() || '담당 트레이너'
  return `${formatScheduledAtKst(target.scheduledAt)} · ${trainer}`
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
