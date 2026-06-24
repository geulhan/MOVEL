import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import {
  createMember,
  DUPLICATE_MEMBER_PHONE_MESSAGE,
  findMemberIdByPhoneInCenter,
  normalizePhone,
  todayDateString,
} from './members'
import type {
  ConsultationLead,
  LeadActivity,
  LeadActivityType,
  LeadInterest,
  LeadSource,
  LeadStatus,
} from '../types/leads'
import { LEAD_STATUS_LABELS } from '../types/leads'
import type { Member } from '../types/database'

function normalizeLeadRow(row: Record<string, unknown>): ConsultationLead {
  return row as ConsultationLead
}

function normalizeActivityRow(row: Record<string, unknown>): LeadActivity {
  return {
    ...(row as LeadActivity),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

export type LeadCreateInput = {
  legal_name?: string
  display_label?: string
  phone?: string
  source?: LeadSource
  interest?: LeadInterest
  message?: string
  status?: LeadStatus
  assigned_trainer_id?: string | null
  assigned_trainer_name?: string | null
  agree_privacy?: boolean
  agree_marketing?: boolean
  next_contact_at?: string | null
  initial_note?: string
}

export type LeadUpdateInput = Partial<Omit<LeadCreateInput, 'initial_note'>> & {
  status?: LeadStatus
}

function validateLeadInput(input: LeadCreateInput): void {
  const phone = input.phone?.trim() ?? ''
  const name = input.legal_name?.trim() ?? ''
  const label = input.display_label?.trim() ?? ''
  const message = input.message?.trim() ?? ''

  if (!phone && !name && !label && !message) {
    throw new Error('연락처, 이름, 구분 라벨, 문의 내용 중 하나 이상 입력해 주세요.')
  }

  if (phone && !input.agree_privacy) {
    throw new Error('연락처를 저장하려면 개인정보 수집·이용 동의가 필요합니다.')
  }
}

async function insertLeadActivity(
  leadId: string,
  centerId: string,
  activityType: LeadActivityType,
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from('lead_activities').insert({
    lead_id: leadId,
    center_id: centerId,
    activity_type: activityType,
    content,
    metadata,
  })
  if (error) throw error
}

async function touchLeadActivity(leadId: string, centerId: string): Promise<void> {
  const { error } = await supabase
    .from('consultation_leads')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('center_id', centerId)
  if (error) throw error
}

export async function purgeExpiredLeads(): Promise<number> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase.rpc('purge_expired_consultation_leads', {
    p_center_id: centerId,
  })
  if (error) {
    if (error.code === 'PGRST202') return 0
    throw error
  }
  return typeof data === 'number' ? data : 0
}

export async function fetchLeads(options?: {
  status?: LeadStatus | 'active' | 'all'
  search?: string
}): Promise<ConsultationLead[]> {
  await purgeExpiredLeads().catch(() => undefined)

  const centerId = await getCurrentCenterId()
  let query = supabase
    .from('consultation_leads')
    .select('*')
    .eq('center_id', centerId)
    .order('last_activity_at', { ascending: false })
    .limit(500)

  const status = options?.status ?? 'active'
  if (status === 'active') {
    query = query.in('status', [
      'new',
      'contacted',
      'trial_scheduled',
      'trial_done',
      'pending_register',
      'on_hold',
    ])
  } else if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error

  let rows = (data ?? []).map((row) => normalizeLeadRow(row as Record<string, unknown>))

  const term = options?.search?.trim().toLowerCase()
  if (term) {
    rows = rows.filter((lead) => {
      const haystack = [
        lead.display_name,
        lead.display_label,
        lead.legal_name,
        lead.phone,
        lead.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }

  return rows
}

export async function fetchLeadById(leadId: string): Promise<ConsultationLead | null> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('consultation_leads')
    .select('*')
    .eq('id', leadId)
    .eq('center_id', centerId)
    .maybeSingle()

  if (error) throw error
  return data ? normalizeLeadRow(data as Record<string, unknown>) : null
}

export async function fetchLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data ?? []).map((row) => normalizeActivityRow(row as Record<string, unknown>))
}

export async function createLead(input: LeadCreateInput): Promise<ConsultationLead> {
  validateLeadInput(input)
  const centerId = await getCurrentCenterId()

  const phoneRaw = input.phone?.trim()
  const normalizedPhone = phoneRaw ? normalizePhone(phoneRaw) : null

  if (normalizedPhone) {
    const existingMemberId = await findMemberIdByPhoneInCenter(centerId, normalizedPhone)
    if (existingMemberId) {
      throw new Error('이미 등록된 회원 번호입니다. 회원 관리에서 확인해 주세요.')
    }
  }

  const now = new Date().toISOString()
  const agreeMarketing = Boolean(input.agree_marketing)

  const { data, error } = await supabase
    .from('consultation_leads')
    .insert({
      center_id: centerId,
      legal_name: input.legal_name?.trim() || null,
      display_label: input.display_label?.trim() || null,
      phone: normalizedPhone,
      source: input.source ?? 'other',
      interest: input.interest ?? 'other',
      message: input.message?.trim() ?? '',
      status: input.status ?? 'new',
      assigned_trainer_id: input.assigned_trainer_id ?? null,
      assigned_trainer_name: input.assigned_trainer_name?.trim() || null,
      agree_privacy: Boolean(input.agree_privacy),
      agree_marketing: agreeMarketing,
      agree_marketing_at: agreeMarketing ? now : null,
      next_contact_at: input.next_contact_at || null,
      last_activity_at: now,
    })
    .select('*')
    .single()

  if (error) throw error

  const lead = normalizeLeadRow(data as Record<string, unknown>)

  if (input.agree_privacy) {
    await insertLeadActivity(lead.id, centerId, 'privacy_agreed', '개인정보 수집·이용 동의')
  }
  if (agreeMarketing) {
    await insertLeadActivity(lead.id, centerId, 'marketing_agreed', '마케팅 수신 동의')
  }
  if (input.initial_note?.trim()) {
    await insertLeadActivity(lead.id, centerId, 'note', input.initial_note.trim())
  } else if (lead.message) {
    await insertLeadActivity(lead.id, centerId, 'note', lead.message)
  }

  return (await fetchLeadById(lead.id)) ?? lead
}

export async function updateLead(
  leadId: string,
  input: LeadUpdateInput,
): Promise<ConsultationLead> {
  const centerId = await getCurrentCenterId()
  const existing = await fetchLeadById(leadId)
  if (!existing) throw new Error('리드를 찾을 수 없습니다.')

  const patch: Record<string, unknown> = {
    last_activity_at: new Date().toISOString(),
  }

  if (input.legal_name !== undefined) patch.legal_name = input.legal_name.trim() || null
  if (input.display_label !== undefined) {
    patch.display_label = input.display_label.trim() || null
  }
  if (input.phone !== undefined) {
    const nextPhone = input.phone.trim() ? normalizePhone(input.phone) : null
    if (nextPhone && !input.agree_privacy && !existing.agree_privacy) {
      throw new Error('연락처를 추가하려면 개인정보 수집·이용 동의가 필요합니다.')
    }
    patch.phone = nextPhone
    if (nextPhone && !existing.phone) {
      const memberId = await findMemberIdByPhoneInCenter(centerId, nextPhone)
      if (memberId) throw new Error('이미 등록된 회원 번호입니다.')
    }
  }
  if (input.source !== undefined) patch.source = input.source
  if (input.interest !== undefined) patch.interest = input.interest
  if (input.message !== undefined) patch.message = input.message.trim()
  if (input.assigned_trainer_id !== undefined) {
    patch.assigned_trainer_id = input.assigned_trainer_id
  }
  if (input.assigned_trainer_name !== undefined) {
    patch.assigned_trainer_name = input.assigned_trainer_name?.trim() || null
  }
  if (input.next_contact_at !== undefined) patch.next_contact_at = input.next_contact_at
  if (input.agree_privacy !== undefined) patch.agree_privacy = input.agree_privacy
  if (input.agree_marketing !== undefined) {
    patch.agree_marketing = input.agree_marketing
    patch.agree_marketing_at = input.agree_marketing ? new Date().toISOString() : null
  }

  if (input.status !== undefined && input.status !== existing.status) {
    patch.status = input.status
    await insertLeadActivity(
      leadId,
      centerId,
      'status_change',
      `${LEAD_STATUS_LABELS[existing.status]} → ${LEAD_STATUS_LABELS[input.status]}`,
      { from: existing.status, to: input.status },
    )
  }

  const { error } = await supabase
    .from('consultation_leads')
    .update(patch)
    .eq('id', leadId)
    .eq('center_id', centerId)

  if (error) throw error

  return (await fetchLeadById(leadId))!
}

export async function addLeadNote(leadId: string, content: string): Promise<void> {
  const trimmed = content.trim()
  if (!trimmed) return
  const centerId = await getCurrentCenterId()
  await insertLeadActivity(leadId, centerId, 'note', trimmed)
  await touchLeadActivity(leadId, centerId)
}

export async function convertLeadToMember(leadId: string): Promise<{
  member: Member
  lead: ConsultationLead
}> {
  const lead = await fetchLeadById(leadId)
  if (!lead) throw new Error('리드를 찾을 수 없습니다.')
  if (lead.status === 'converted' && lead.converted_member_id) {
    throw new Error('이미 회원으로 전환된 리드입니다.')
  }
  if (!lead.phone) {
    throw new Error('회원 전환에는 연락처가 필요합니다.')
  }

  const memberName =
    lead.legal_name?.trim() || lead.display_label?.trim() || '미입력'

  let member: Member
  try {
    member = await createMember({
      name: memberName,
      phone: lead.phone,
      total_sessions: 0,
      payment_amount: 0,
      registered_at: todayDateString(),
      trainer_id: lead.assigned_trainer_id,
      trainer_name: lead.assigned_trainer_name,
    })
  } catch (err) {
    if (err instanceof Error && err.message === DUPLICATE_MEMBER_PHONE_MESSAGE) {
      throw new Error('이미 등록된 회원입니다. 회원 관리에서 확인해 주세요.')
    }
    throw err
  }

  const centerId = await getCurrentCenterId()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('consultation_leads')
    .update({
      status: 'converted',
      converted_member_id: member.id,
      converted_at: now,
      last_activity_at: now,
    })
    .eq('id', leadId)
    .eq('center_id', centerId)

  if (error) throw error

  await insertLeadActivity(
    leadId,
    centerId,
    'converted',
    `회원 전환: ${member.name} (${member.phone})`,
    { member_id: member.id },
  )

  const updatedLead = (await fetchLeadById(leadId))!
  return { member, lead: updatedLead }
}

export function formatLeadRetentionLabel(lead: ConsultationLead): string {
  const until = new Date(lead.retention_until)
  const days = Math.ceil((until.getTime() - Date.now()) / 86_400_000)
  if (days < 0) return '만료'
  if (lead.identity_level === 'anonymous') return `무기명 · ${days}일 후 삭제`
  return `연락처 · ${days}일 후 삭제`
}

export function isLeadContactDueToday(lead: ConsultationLead): boolean {
  if (!lead.next_contact_at) return false
  return lead.next_contact_at <= todayDateString()
}
