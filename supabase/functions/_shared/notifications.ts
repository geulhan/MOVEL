import {
  getTemplateSendDisabledReason,
  normalizeTemplateKey,
  type AlimtalkTemplateKey,
  usesCenterCredits,
} from './alimtalkTemplateRegistry.ts'
import {
  getPlatformMessagingContext,
  loadCenterMessagingContext,
} from './centerMessaging.ts'
import { resolveCenterAdminPhones } from './centerRecipients.ts'
import {
  creditsForChannel,
  tryConsumeMessageCredits,
} from './messageCredits.ts'
import { isCenterMessagingReady, sendAlimtalk } from './solapi.ts'
import { getSupabaseAdmin } from './supabaseAdmin.ts'
import {
  buildTemplateVariables,
  type MemberRow,
  type TemplateVariableContext,
} from './templates.ts'

export type SendNotificationInput = {
  templateKey: AlimtalkTemplateKey | string
  memberId: string
  paymentId?: string
  metadata?: Record<string, string | number>
  variablesOverride?: Record<string, string>
}

export type SendCenterNotificationInput = {
  templateKey: AlimtalkTemplateKey | string
  centerId: string
  metadata?: Record<string, string | number>
  variablesOverride?: Record<string, string>
}

export type SendNotificationResult = {
  ok: boolean
  status: 'sent' | 'failed' | 'skipped'
  logId?: string
  error?: string
  skippedReason?: string
}

function todayKst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

async function resolveNotificationCenterId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  memberCenterId?: string | null,
): Promise<string | null> {
  if (memberCenterId) return String(memberCenterId)

  const { data: rpcId, error: rpcError } = await supabase.rpc(
    'get_default_center_id',
  )
  if (!rpcError && rpcId) return String(rpcId)

  const { data: center, error: centerError } = await supabase
    .from('centers')
    .select('id')
    .eq('slug', 'movel')
    .eq('status', 'active')
    .maybeSingle()

  if (!centerError && center?.id) return String(center.id)
  return null
}

async function hasDuplicate(
  templateKey: AlimtalkTemplateKey,
  memberId: string,
  metadata: Record<string, string | number>,
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  if (templateKey === 'member_signup_guide') {
    const { count: newCount } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'member_signup_guide')
      .in('status', ['sent', 'skipped'])
    if ((newCount ?? 0) > 0) return true

    const { count: legacyCount } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .in('template_key', ['member_welcome', 'welcome'])
      .in('status', ['sent', 'skipped'])
    return (legacyCount ?? 0) > 0
  }

  if (templateKey === 'payment_completed' && metadata.payment_id) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'payment_completed')
      .contains('metadata', { payment_id: String(metadata.payment_id) })
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  if (
    (templateKey === 'membership_expire_14' ||
      templateKey === 'membership_expire_7' ||
      templateKey === 'membership_expire_today') &&
    metadata.expire_date
  ) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', templateKey)
      .eq('metadata->>expire_date', String(metadata.expire_date))
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  if (
    (templateKey === 'pt_remaining_3' || templateKey === 'pt_remaining_1') &&
    metadata.membership_key
  ) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', templateKey)
      .eq('metadata->>membership_key', String(metadata.membership_key))
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  if (templateKey === 'schedule_reminder' && metadata.schedule_id) {
    const { count: newCount } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'schedule_reminder')
      .eq('metadata->>schedule_id', String(metadata.schedule_id))
      .in('status', ['sent', 'skipped'])
    if ((newCount ?? 0) > 0) return true

    const { count: legacyCount } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'pt_reminder')
      .eq('metadata->>schedule_id', String(metadata.schedule_id))
      .in('status', ['sent', 'skipped'])
    return (legacyCount ?? 0) > 0
  }

  if (
    (templateKey === 'schedule_changed' ||
      templateKey === 'schedule_cancelled') &&
    metadata.schedule_id
  ) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', templateKey)
      .eq('metadata->>schedule_id', String(metadata.schedule_id))
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  if (
    templateKey === 'step_verification_result' &&
    metadata.verification_id
  ) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'step_verification_result')
      .eq('metadata->>verification_id', String(metadata.verification_id))
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  return false
}

async function hasCenterDuplicate(
  templateKey: AlimtalkTemplateKey,
  centerId: string,
  metadata: Record<string, string | number>,
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  if (templateKey === 'center_welcome') {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('template_key', 'center_welcome')
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  if (templateKey === 'weekly_report' && metadata.report_week) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', centerId)
      .eq('template_key', 'weekly_report')
      .eq('metadata->>report_week', String(metadata.report_week))
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  return false
}

function buildExtraFromMetadata(
  metadata: Record<string, string | number>,
): TemplateVariableContext {
  return {
    amount: Number(metadata.amount ?? 0),
    sessions: Number(metadata.sessions ?? 0),
    daysLeft: Number(metadata.days_left ?? 0),
    approved: metadata.approved === '1' || metadata.approved === 1,
    reason: String(metadata.reason ?? ''),
    scheduledAt: String(metadata.scheduled_at ?? ''),
    scheduleDate: String(metadata.schedule_date ?? metadata.scheduled_at ?? ''),
    trainerName: String(metadata.trainer_name ?? ''),
    className: String(metadata.class_name ?? ''),
    productName: String(metadata.product_name ?? ''),
    remainingCount: Number(metadata.remaining_count ?? 0),
    expireDate: String(metadata.expire_date ?? ''),
    reportWeek: String(metadata.report_week ?? ''),
    activeMembers: Number(metadata.active_members ?? 0),
    newMembers: Number(metadata.new_members ?? 0),
  }
}

export async function sendMemberNotification(
  input: SendNotificationInput,
): Promise<SendNotificationResult> {
  const normalized = normalizeTemplateKey(String(input.templateKey))
  if (!normalized) {
    return { ok: false, status: 'failed', error: 'Invalid templateKey' }
  }
  if (!usesCenterCredits(normalized)) {
    return {
      ok: false,
      status: 'failed',
      error: 'Use sendCenterNotification for center templates',
    }
  }

  const supabase = getSupabaseAdmin()
  const templateKey = normalized
  const metadata: Record<string, string | number> = {
    ...(input.metadata ?? {}),
  }
  if (input.paymentId) metadata.payment_id = input.paymentId

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, name, phone, expires_at, remaining_sessions, status, center_id')
    .eq('id', input.memberId)
    .maybeSingle()

  if (memberError) {
    return { ok: false, status: 'failed', error: memberError.message }
  }
  if (!member) {
    return { ok: false, status: 'failed', error: 'Member not found' }
  }
  if (member.status === 'terminated') {
    return {
      ok: true,
      status: 'skipped',
      skippedReason: 'terminated member',
    }
  }

  const phone = String(member.phone).replace(/\D/g, '')
  if (phone.length < 10) {
    return { ok: false, status: 'failed', error: 'Invalid phone number' }
  }

  const centerId = await resolveNotificationCenterId(supabase, member.center_id)
  if (!centerId) {
    return {
      ok: false,
      status: 'failed',
      error:
        '센터(center_id)를 확인할 수 없습니다. migration_032_centers.sql을 실행해 주세요.',
    }
  }

  const messagingContext = await loadCenterMessagingContext(supabase, centerId)
  if (!messagingContext) {
    return {
      ok: false,
      status: 'failed',
      error: '센터 정보를 불러올 수 없습니다.',
    }
  }

  const config = messagingContext.config

  if (!config.enabled) {
    return {
      ok: true,
      status: 'skipped',
      skippedReason: 'notifications_disabled',
      error: '알림톡 사용이 꺼져 있습니다.',
    }
  }

  const notApprovedReason = getTemplateSendDisabledReason(templateKey)
  if (notApprovedReason) {
    const now = new Date().toISOString()
    const { data: logRow, error: logError } = await supabase
      .from('message_logs')
      .insert({
        center_id: centerId,
        member_id: input.memberId,
        phone,
        template_key: templateKey,
        channel: 'skipped',
        status: 'skipped',
        error_message: notApprovedReason,
        metadata,
        sent_at: now,
      })
      .select('id')
      .single()

    if (logError) {
      return { ok: false, status: 'failed', error: logError.message }
    }

    return {
      ok: true,
      status: 'skipped',
      logId: logRow.id,
      skippedReason: notApprovedReason,
      error: '템플릿 검수 미승인으로 발송이 비활성화되었습니다.',
    }
  }

  const { data: summary } = await supabase.rpc('get_message_credit_summary', {
    p_center_id: centerId,
  })
  const balance =
    summary && typeof summary === 'object' && !Array.isArray(summary)
      ? Number((summary as Record<string, unknown>).balance ?? 0)
      : 0

  if (balance <= 0) {
    const now = new Date().toISOString()
    const { data: logRow, error: logError } = await supabase
      .from('message_logs')
      .insert({
        center_id: centerId,
        member_id: input.memberId,
        phone,
        template_key: templateKey,
        channel: 'skipped',
        status: 'skipped',
        error_message: '메시지 크레딧 부족',
        metadata,
        sent_at: now,
      })
      .select('id')
      .single()

    if (logError) {
      return { ok: false, status: 'failed', error: logError.message }
    }

    return {
      ok: true,
      status: 'skipped',
      logId: logRow.id,
      skippedReason: 'insufficient_credits',
      error: '메시지 크레딧이 부족합니다.',
    }
  }

  if (await hasDuplicate(templateKey, input.memberId, metadata)) {
    const now = new Date().toISOString()
    const { data: logRow, error: logError } = await supabase
      .from('message_logs')
      .insert({
        center_id: centerId,
        member_id: input.memberId,
        phone,
        template_key: templateKey,
        channel: 'skipped',
        status: 'skipped',
        error_message: '이미 발송됨 (중복)',
        metadata: { ...metadata, skipped_reason: 'duplicate' },
        sent_at: now,
      })
      .select('id')
      .single()

    if (logError) {
      return { ok: false, status: 'failed', error: logError.message }
    }

    return {
      ok: true,
      status: 'skipped',
      logId: logRow.id,
      skippedReason: 'duplicate',
      error: '이미 발송된 메시지입니다.',
    }
  }

  let amount = 0
  let sessions = 0
  let productName = ''
  if (templateKey === 'payment_completed' && input.paymentId) {
    const { data: payment } = await supabase
      .from('payment_history')
      .select('amount, sessions, note')
      .eq('id', input.paymentId)
      .maybeSingle()
    if (payment) {
      amount = Number(payment.amount)
      sessions = Number(payment.sessions)
      productName = String(payment.note ?? '').trim() || `PT ${sessions}회`
    }
  }

  if (
    (templateKey === 'membership_expire_14' ||
      templateKey === 'membership_expire_7' ||
      templateKey === 'membership_expire_today') &&
    member.expires_at &&
    !metadata.expire_date
  ) {
    metadata.expire_date = member.expires_at.split('T')[0]
  }

  if (
    (templateKey === 'pt_remaining_3' || templateKey === 'pt_remaining_1') &&
    !metadata.membership_key
  ) {
    metadata.membership_key = `${member.id}:${member.remaining_sessions}`
    metadata.remaining_count = member.remaining_sessions
  }

  const extra = buildExtraFromMetadata(metadata)
  if (productName) extra.productName = productName
  if (templateKey === 'payment_completed') {
    extra.amount = amount
    extra.sessions = sessions
  }

  const variables =
    input.variablesOverride ??
    buildTemplateVariables(
      templateKey,
      member as MemberRow,
      {
        siteUrl: config.siteUrl,
        centerSlug: messagingContext.centerSlug,
        centerName: messagingContext.centerName,
      },
      extra,
    )

  const readiness = isCenterMessagingReady(messagingContext, templateKey)
  const now = new Date().toISOString()

  if (readiness) {
    const { data: logRow, error: logError } = await supabase
      .from('message_logs')
      .insert({
        center_id: centerId,
        member_id: input.memberId,
        phone,
        template_key: templateKey,
        channel: 'skipped',
        status: 'skipped',
        error_message: readiness,
        variables,
        metadata,
        sent_at: now,
      })
      .select('id')
      .single()

    if (logError) {
      return { ok: false, status: 'failed', error: logError.message }
    }

    return {
      ok: true,
      status: 'skipped',
      logId: logRow.id,
      skippedReason: readiness,
    }
  }

  const { data: pendingLog, error: pendingError } = await supabase
    .from('message_logs')
    .insert({
      center_id: centerId,
      member_id: input.memberId,
      phone,
      template_key: templateKey,
      status: 'pending',
      variables,
      metadata,
    })
    .select('id')
    .single()

  if (pendingError || !pendingLog) {
    return {
      ok: false,
      status: 'failed',
      error: pendingError?.message ?? 'Failed to create log',
    }
  }

  const sendResult = await sendAlimtalk(
    config,
    templateKey,
    phone,
    variables,
  )

  if (!sendResult.ok) {
    await supabase
      .from('message_logs')
      .update({
        status: 'failed',
        channel: 'alimtalk',
        error_message: sendResult.error ?? 'Send failed',
        sent_at: now,
      })
      .eq('id', pendingLog.id)

    return {
      ok: false,
      status: 'failed',
      logId: pendingLog.id,
      error: sendResult.error,
    }
  }

  await supabase
    .from('message_logs')
    .update({
      status: 'sent',
      channel: sendResult.channel ?? 'alimtalk',
      provider_message_id: sendResult.messageId ?? null,
      sent_at: now,
    })
    .eq('id', pendingLog.id)

  const sentChannel = (sendResult.channel ?? 'alimtalk') as 'alimtalk' | 'sms'
  const creditAmount = creditsForChannel(sentChannel)
  const consumeResult = await tryConsumeMessageCredits(
    supabase,
    centerId,
    creditAmount,
    `발송: ${templateKey}`,
    {
      message_log_id: pendingLog.id,
      template_key: templateKey,
      channel: sentChannel,
      member_id: input.memberId,
    },
  )

  if (!consumeResult.ok) {
    return {
      ok: true,
      status: 'sent',
      logId: pendingLog.id,
      error: consumeResult.message ?? '발송 후 크레딧 차감 실패',
    }
  }

  return { ok: true, status: 'sent', logId: pendingLog.id }
}

/** 센터 관리자 대상 — MotionHub 플랫폼 발송, 센터 크레딧 미차감 */
export async function sendCenterNotification(
  input: SendCenterNotificationInput,
): Promise<SendNotificationResult> {
  const normalized = normalizeTemplateKey(String(input.templateKey))
  if (!normalized) {
    return { ok: false, status: 'failed', error: 'Invalid templateKey' }
  }
  if (usesCenterCredits(normalized)) {
    return {
      ok: false,
      status: 'failed',
      error: 'Use sendMemberNotification for member templates',
    }
  }

  const templateKey = normalized
  const supabase = getSupabaseAdmin()
  const metadata: Record<string, string | number> = {
    audience: 'center_admin',
    ...(input.metadata ?? {}),
  }

  const { data: center, error: centerError } = await supabase
    .from('centers')
    .select('id, slug, name, status')
    .eq('id', input.centerId)
    .maybeSingle()

  if (centerError) {
    return { ok: false, status: 'failed', error: centerError.message }
  }
  if (!center || center.status !== 'active') {
    return { ok: false, status: 'failed', error: 'Center not found or inactive' }
  }

  const phones = await resolveCenterAdminPhones(supabase, input.centerId)
  if (phones.length === 0) {
    return {
      ok: true,
      status: 'skipped',
      skippedReason: 'no_center_admin_phone',
      error:
        '센터 관리자 전화번호가 없습니다. center_users.phone 또는 centers.contact_phone을 등록해 주세요.',
    }
  }

  const messagingContext = getPlatformMessagingContext(
    String(center.id),
    String(center.slug),
    String(center.name),
  )
  const config = messagingContext.config

  if (!config.enabled) {
    return {
      ok: true,
      status: 'skipped',
      skippedReason: 'notifications_disabled',
    }
  }

  const notApprovedReason = getTemplateSendDisabledReason(templateKey)
  if (notApprovedReason) {
    const now = new Date().toISOString()
    const phone = phones[0]
    const { data: logRow, error: logError } = await supabase
      .from('message_logs')
      .insert({
        center_id: input.centerId,
        member_id: null,
        phone,
        template_key: templateKey,
        channel: 'skipped',
        status: 'skipped',
        error_message: notApprovedReason,
        metadata: { ...metadata, recipient_phones: phones.join(',') },
        sent_at: now,
      })
      .select('id')
      .single()

    if (logError) {
      return { ok: false, status: 'failed', error: logError.message }
    }

    return {
      ok: true,
      status: 'skipped',
      logId: logRow.id,
      skippedReason: notApprovedReason,
      error: '템플릿 검수 미승인으로 발송이 비활성화되었습니다.',
    }
  }

  if (await hasCenterDuplicate(templateKey, input.centerId, metadata)) {
    return {
      ok: true,
      status: 'skipped',
      skippedReason: 'duplicate',
    }
  }

  const extra = buildExtraFromMetadata(metadata)
  const variables =
    input.variablesOverride ??
    buildTemplateVariables(templateKey, null, {
      siteUrl: config.siteUrl,
      centerSlug: messagingContext.centerSlug,
      centerName: messagingContext.centerName,
    }, extra)

  const readiness = isCenterMessagingReady(messagingContext, templateKey)
  const now = new Date().toISOString()
  const phone = phones[0]

  if (readiness) {
    const { data: logRow, error: logError } = await supabase
      .from('message_logs')
      .insert({
        center_id: input.centerId,
        member_id: null,
        phone,
        template_key: templateKey,
        channel: 'skipped',
        status: 'skipped',
        error_message: readiness,
        variables,
        metadata: { ...metadata, recipient_phones: phones.join(',') },
        sent_at: now,
      })
      .select('id')
      .single()

    if (logError) {
      return { ok: false, status: 'failed', error: logError.message }
    }

    return {
      ok: true,
      status: 'skipped',
      logId: logRow.id,
      skippedReason: readiness,
    }
  }

  const { data: pendingLog, error: pendingError } = await supabase
    .from('message_logs')
    .insert({
      center_id: input.centerId,
      member_id: null,
      phone,
      template_key: templateKey,
      status: 'pending',
      variables,
      metadata: { ...metadata, recipient_phones: phones.join(',') },
    })
    .select('id')
    .single()

  if (pendingError || !pendingLog) {
    return {
      ok: false,
      status: 'failed',
      error: pendingError?.message ?? 'Failed to create log',
    }
  }

  const sendResult = await sendAlimtalk(config, templateKey, phone, variables)

  if (!sendResult.ok) {
    await supabase
      .from('message_logs')
      .update({
        status: 'failed',
        channel: 'alimtalk',
        error_message: sendResult.error ?? 'Send failed',
        sent_at: now,
      })
      .eq('id', pendingLog.id)

    return {
      ok: false,
      status: 'failed',
      logId: pendingLog.id,
      error: sendResult.error,
    }
  }

  await supabase
    .from('message_logs')
    .update({
      status: 'sent',
      channel: sendResult.channel ?? 'alimtalk',
      provider_message_id: sendResult.messageId ?? null,
      sent_at: now,
    })
    .eq('id', pendingLog.id)

  return { ok: true, status: 'sent', logId: pendingLog.id }
}

export function daysBetweenKst(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00+09:00`)
  const end = new Date(`${to}T12:00:00+09:00`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

export function addDaysKst(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00+09:00`)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

export function membershipExpireTemplateKey(
  daysLeft: number,
): AlimtalkTemplateKey | null {
  if (daysLeft === 14) return 'membership_expire_14'
  if (daysLeft === 7) return 'membership_expire_7'
  if (daysLeft === 0) return 'membership_expire_today'
  return null
}

export function ptRemainingTemplateKey(
  remaining: number,
): AlimtalkTemplateKey | null {
  if (remaining === 3) return 'pt_remaining_3'
  if (remaining === 1) return 'pt_remaining_1'
  return null
}
