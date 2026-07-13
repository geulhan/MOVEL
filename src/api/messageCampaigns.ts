import { getCurrentCenterId } from '../lib/center'
import { fetchMembers, formatDate, todayDateString } from './members'
import { sendNotification, type SendNotificationResult } from './notifications'
import { supabase } from '../lib/supabase'
import type { Member, MessageTemplateKey, PaymentHistory, Json } from '../types/database'
import { MESSAGE_TEMPLATE_LABELS } from '../types/database'
import {
  membershipExpireTemplateKey,
  ptRemainingTemplateKey,
} from '../constants/alimtalkTemplates'
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
  alreadySent: boolean
  sendTemplateKey: MessageTemplateKey | null
  sendLabel: string
  sendMetadata: Record<string, string | number>
  dedupKey: string
  category: RenewalTargetCategory
}

export type RenewalTargetCategory = 'pt' | 'facility'

export type PtReminderTarget = {
  member: Member
  scheduleId: string
  scheduledAt: string
  trainerName: string
}

const PT_REMINDER_HOURS = 24

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
      'pt_remaining_3',
      'pt_remaining_1',
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
      membership_key?: string
      dismiss_tier_key?: string
      skipped_reason?: string
      campaign_dismissed?: boolean
    } | null
    const templateKey = String(row.template_key ?? '')

    const markDismissed = (tierKey: string) => {
      dismissedKeys.add(tierKey)
      if (metadata?.dismiss_tier_key) {
        dismissedKeys.add(String(metadata.dismiss_tier_key))
      }
    }

    if (isRenewalCampaignDismissed(metadata)) {
      if (templateKey === 'pt_remaining_3' || templateKey === 'pt_remaining_1') {
        const tierKey = metadata?.membership_key
        if (tierKey) markDismissed(tierKey)
        continue
      }

      if (templateKey === 'renewal') {
        if (metadata?.dismiss_tier_key) {
          markDismissed(String(metadata.dismiss_tier_key))
        }
        if (metadata?.days_left != null) {
          markDismissed(`${row.member_id}:${metadata.days_left}`)
        }
        continue
      }

      let daysLeft = metadata?.days_left
      if (daysLeft == null) {
        if (templateKey === 'membership_expire_14') daysLeft = 14
        else if (templateKey === 'membership_expire_7') daysLeft = 7
        else if (templateKey === 'membership_expire_today') daysLeft = 0
      }
      if (daysLeft != null) {
        markDismissed(`${row.member_id}:${daysLeft}`)
      }
      continue
    }

    if (templateKey === 'pt_remaining_3' || templateKey === 'pt_remaining_1') {
      const tierKey = metadata?.membership_key
      if (!tierKey) continue
      if (row.status === 'sent') {
        sentKeys.add(tierKey)
      }
      continue
    }

    let daysLeft = metadata?.days_left
    if (daysLeft == null) {
      if (templateKey === 'membership_expire_14') daysLeft = 14
      else if (templateKey === 'membership_expire_7') daysLeft = 7
      else if (templateKey === 'membership_expire_today') daysLeft = 0
    }
    if (daysLeft == null) continue
    const key = `${row.member_id}:${daysLeft}`
    if (row.status === 'sent') {
      sentKeys.add(key)
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
        (isRenewalTarget(member) ||
          isExpiringSoon(member.expires_at, member.status)),
    )
    .map((member) => {
      const expiresAt = member.expires_at?.split('T')[0]
      const daysLeft = expiresAt ? Math.max(0, daysBetween(today, expiresAt)) : 0
      const plan = resolveRenewalSendPlan(member, daysLeft)
      return {
        member,
        daysLeft,
        alreadySent: sentKeys.has(plan.dedupKey),
        sendTemplateKey: plan.templateKey,
        sendLabel: plan.sendLabel,
        sendMetadata: plan.metadata,
        dedupKey: plan.dedupKey,
        category: renewalTargetCategory(member, plan.templateKey),
      }
    })
    .filter((row) => !dismissedKeys.has(row.dedupKey))
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
  const windowStart = new Date(now).toISOString()
  const windowEnd = new Date(now + PT_REMINDER_HOURS * hourMs).toISOString()

  const [members, schedulesResult, trainersResult, notifiedIds] =
    await Promise.all([
      fetchMembers(),
      supabase
        .from('pt_schedules')
        .select('id, member_id, scheduled_at, trainer_id')
        .eq('center_id', centerId)
        .eq('status', 'scheduled')
        .gt('scheduled_at', windowStart)
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
  return sendNotification('member_signup_guide', memberId)
}

export async function sendPaymentMessage(
  memberId: string,
  paymentId: string,
): Promise<SendNotificationResult> {
  return sendNotification('payment_completed', memberId, { paymentId })
}

export async function sendRenewalMessage(
  target: Pick<
    RenewalTarget,
    'member' | 'sendTemplateKey' | 'sendMetadata'
  >,
): Promise<SendNotificationResult> {
  if (!target.sendTemplateKey) {
    return {
      ok: false,
      status: 'failed',
      error: '지금 발송할 수 있는 알림 구간이 아닙니다.',
    }
  }
  return sendNotification(target.sendTemplateKey, target.member.id, {
    metadata: target.sendMetadata,
  })
}

export async function sendRenewalMessageForMember(
  memberId: string,
): Promise<SendNotificationResult> {
  const targets = await buildRenewalTargets()
  const target = targets.find((row) => row.member.id === memberId)
  if (!target) {
    return {
      ok: false,
      status: 'failed',
      error: '현재 재등록 알림을 보낼 수 있는 구간이 아닙니다.',
    }
  }
  return sendRenewalMessage(target)
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
function isRenewalCampaignDismissed(
  metadata: {
    skipped_reason?: string
    campaign_dismissed?: boolean
  } | null,
): boolean {
  if (!metadata) return false
  if (metadata.campaign_dismissed) return true
  return metadata.skipped_reason === 'manual_dismiss'
}

function renewalDismissMetadata(
  target: RenewalTarget,
): Record<string, string | number | boolean> {
  const base =
    Object.keys(target.sendMetadata).length > 0
      ? target.sendMetadata
      : { days_left: target.daysLeft }

  return {
    ...base,
    dismiss_tier_key: target.dedupKey,
    campaign_dismissed: true,
    skipped_reason: 'manual_dismiss',
  }
}

type RenewalDismissLogRow = {
  id: string
  metadata: Record<string, string | number | boolean> | null
  status: string
}

function toRenewalDismissLogRow(
  row: { id: string; metadata: Json; status: string } | null,
): RenewalDismissLogRow | null {
  if (!row) return null
  const metadata =
    row.metadata &&
    typeof row.metadata === 'object' &&
    !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, string | number | boolean>)
      : null
  return { id: row.id, metadata, status: row.status }
}

async function findRenewalMessageLogForDismiss(
  target: RenewalTarget,
): Promise<RenewalDismissLogRow | null> {
  const centerId = await getCurrentCenterId()
  const templateKey = target.sendTemplateKey ?? 'renewal'

  const base = () =>
    supabase
      .from('message_logs')
      .select('id, metadata, status')
      .eq('center_id', centerId)
      .eq('member_id', target.member.id)
      .in('status', ['sent', 'skipped'])

  if (
    target.sendTemplateKey === 'pt_remaining_3' ||
    target.sendTemplateKey === 'pt_remaining_1'
  ) {
    const membershipKey = String(
      target.sendMetadata.membership_key ?? target.dedupKey,
    )
    const { data, error } = await base()
      .eq('template_key', templateKey)
      .eq('metadata->>membership_key', membershipKey)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return toRenewalDismissLogRow(data)
  }

  if (target.sendMetadata.expire_date) {
    const { data, error } = await base()
      .eq('template_key', templateKey)
      .eq('metadata->>expire_date', String(target.sendMetadata.expire_date))
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return toRenewalDismissLogRow(data)
  }

  if (target.dedupKey.endsWith(':pending')) {
    const { data: byTier, error: tierError } = await base()
      .eq('metadata->>dismiss_tier_key', target.dedupKey)
      .limit(1)
      .maybeSingle()
    if (tierError) throw tierError
    const mapped = toRenewalDismissLogRow(byTier)
    if (mapped) return mapped
  }

  const { data, error } = await base()
    .eq('template_key', templateKey)
    .eq('metadata->>days_left', String(target.daysLeft))
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return toRenewalDismissLogRow(data)
}

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
      templateKey: 'member_signup_guide' as const,
    })),
  )
}

export async function dismissPaymentTargets(
  targets: Pick<PaymentTarget, 'member' | 'payment'>[],
): Promise<void> {
  await insertSkippedMessageLogs(
    targets.map((target) => ({
      member: target.member,
      templateKey: 'payment_completed' as const,
      metadata: { payment_id: target.payment.id },
    })),
  )
}

export async function dismissRenewalTargets(
  targets: RenewalTarget[],
): Promise<void> {
  if (targets.length === 0) return

  const centerId = await getCurrentCenterId()

  for (const target of targets) {
    const templateKey = target.sendTemplateKey ?? ('renewal' as const)
    const metadata = renewalDismissMetadata(target)
    const existing = await findRenewalMessageLogForDismiss(target)

    if (existing) {
      const previous = (existing.metadata ?? {}) as Record<
        string,
        string | number | boolean
      >
      const { error } = await supabase
        .from('message_logs')
        .update({
          metadata: {
            ...previous,
            ...metadata,
          },
          ...(existing.status === 'sent'
            ? {}
            : {
                channel: 'skipped',
                status: 'skipped',
                error_message: '관리자가 목록에서 제외',
              }),
        })
        .eq('id', existing.id)

      if (error) throw error
      continue
    }

    const { error } = await supabase.from('message_logs').insert({
      center_id: centerId,
      member_id: target.member.id,
      phone: target.member.phone,
      template_key: templateKey,
      channel: 'skipped' as const,
      status: 'skipped' as const,
      metadata,
      error_message: '관리자가 목록에서 제외',
    })

    if (error) throw error
  }
}

export function resolveRenewalSendPlan(
  member: Member,
  daysLeft: number,
): {
  templateKey: MessageTemplateKey | null
  sendLabel: string
  dedupKey: string
  metadata: Record<string, string | number>
} {
  const expiresAt = member.expires_at?.split('T')[0]
  const remaining = member.remaining_sessions

  const ptKey = ptRemainingTemplateKey(remaining)
  if (
    ptKey &&
    member.status !== 'terminated' &&
    member.total_sessions > 0 &&
    remaining <= 5
  ) {
    return {
      templateKey: ptKey,
      sendLabel: MESSAGE_TEMPLATE_LABELS[ptKey],
      dedupKey: `${member.id}:${remaining}`,
      metadata: {
        remaining_count: remaining,
        membership_key: `${member.id}:${remaining}`,
      },
    }
  }

  const membershipKey = membershipExpireTemplateKey(daysLeft)
  if (membershipKey && expiresAt) {
    return {
      templateKey: membershipKey,
      sendLabel: MESSAGE_TEMPLATE_LABELS[membershipKey],
      dedupKey: `${member.id}:${daysLeft}`,
      metadata: {
        days_left: daysLeft,
        expire_date: expiresAt,
        remaining_count: remaining,
      },
    }
  }

  return {
    templateKey: null,
    sendLabel:
      remaining <= 5 ? `잔여 ${remaining}회 (발송 대기)` : `D-${daysLeft} (발송 대기)`,
    dedupKey: `${member.id}:pending`,
    metadata: {},
  }
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

export function renewalTargetCategory(
  member: Member,
  sendTemplateKey: MessageTemplateKey | null,
): RenewalTargetCategory {
  if (
    sendTemplateKey === 'pt_remaining_3' ||
    sendTemplateKey === 'pt_remaining_1'
  ) {
    return 'pt'
  }
  if (
    sendTemplateKey === 'membership_expire_14' ||
    sendTemplateKey === 'membership_expire_7' ||
    sendTemplateKey === 'membership_expire_today'
  ) {
    return 'facility'
  }
  if (member.total_sessions > 0 && member.remaining_sessions <= 5) {
    return 'pt'
  }
  return 'facility'
}

export function formatPtRenewalDetail(member: Member): string {
  return `잔여 ${member.remaining_sessions}회 · 등록 ${member.total_sessions}회`
}

export function formatFacilityRenewalDetail(
  member: Member,
  daysLeft: number,
): string {
  const expiresLabel = member.expires_at ? formatDate(member.expires_at) : '-'
  return `만료 ${expiresLabel} (D-${daysLeft})`
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
