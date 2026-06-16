import { loadCenterMessagingContext } from './centerMessaging.ts'
import {
  creditsForChannel,
  tryConsumeMessageCredits,
} from './messageCredits.ts'
import { isCenterMessagingReady, sendAlimtalk } from './solapi.ts'
import { getSupabaseAdmin } from './supabaseAdmin.ts'
import {
  buildTemplateVariables,
  type MemberRow,
  type TemplateKey,
} from './templates.ts'

export type SendNotificationInput = {
  templateKey: TemplateKey
  memberId: string
  paymentId?: string
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
  templateKey: TemplateKey,
  memberId: string,
  metadata: Record<string, string | number>,
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  if (templateKey === 'welcome') {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'welcome')
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  if (templateKey === 'payment_done' && metadata.payment_id) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'payment_done')
      .contains('metadata', { payment_id: String(metadata.payment_id) })
      .in('status', ['sent', 'skipped'])
    return (count ?? 0) > 0
  }

  if (templateKey === 'renewal' && metadata.days_left != null) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'renewal')
      .eq('metadata->>days_left', String(metadata.days_left))
      .gte('created_at', `${todayKst()}T00:00:00+09:00`)
    return (count ?? 0) > 0
  }

  if (templateKey === 'pt_reminder' && metadata.schedule_id) {
    const { count } = await supabase
      .from('message_logs')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('template_key', 'pt_reminder')
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

export async function sendMemberNotification(
  input: SendNotificationInput,
): Promise<SendNotificationResult> {
  const supabase = getSupabaseAdmin()
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
      error: '센터(center_id)를 확인할 수 없습니다. migration_032_centers.sql을 실행해 주세요.',
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
        template_key: input.templateKey,
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

  if (await hasDuplicate(input.templateKey, input.memberId, metadata)) {
    return {
      ok: true,
      status: 'skipped',
      skippedReason: 'duplicate',
    }
  }

  let amount = 0
  let sessions = 0
  if (input.templateKey === 'payment_done' && input.paymentId) {
    const { data: payment } = await supabase
      .from('payment_history')
      .select('amount, sessions')
      .eq('id', input.paymentId)
      .maybeSingle()
    if (payment) {
      amount = Number(payment.amount)
      sessions = Number(payment.sessions)
    }
  }

  const variables =
    input.variablesOverride ??
    buildTemplateVariables(
      input.templateKey,
      member as MemberRow,
      {
        siteUrl: config.siteUrl,
        centerSlug: messagingContext.centerSlug,
        centerName: messagingContext.centerName,
      },
      {
        amount,
        sessions,
        daysLeft: Number(metadata.days_left ?? 0),
        approved: metadata.approved === '1' || metadata.approved === 1,
        reason: String(metadata.reason ?? ''),
        scheduledAt: String(metadata.scheduled_at ?? ''),
        trainerName: String(metadata.trainer_name ?? ''),
      },
    )

  const readiness = isCenterMessagingReady(messagingContext, input.templateKey)
  const now = new Date().toISOString()

  if (readiness) {
    const { data: logRow, error: logError } = await supabase
      .from('message_logs')
      .insert({
        center_id: centerId,
        member_id: input.memberId,
        phone,
        template_key: input.templateKey,
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
      template_key: input.templateKey,
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
    input.templateKey,
    phone,
    variables,
  )

  if (!sendResult.ok) {
    // 실패한 발송은 크레딧을 차감하지 않습니다.
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
  // 성공(sent)한 발송에만 1건 차감. 실패·스킵은 차감하지 않음.
  const consumeResult = await tryConsumeMessageCredits(
    supabase,
    centerId,
    creditAmount,
    `발송: ${input.templateKey}`,
    {
      message_log_id: pendingLog.id,
      template_key: input.templateKey,
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
