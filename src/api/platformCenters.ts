import { getPlatformSession } from '../lib/platformSession'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import {
  parseServicePeriod,
  type CenterServicePeriod,
} from '../types/centerServicePeriod'

import type { CenterOperationalType } from '../types/centerFeatures'

import type { MessageCreditSummary } from '../types/messageCredits'

function parseMessageCredits(raw: Json | undefined): MessageCreditSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  if (row.ok !== true) return null
  return {
    balance: Number(row.balance ?? 0),
    totalPurchased: Number(row.total_purchased ?? 0),
    totalUsed: Number(row.total_used ?? 0),
    monthUsed: Number(row.month_used ?? 0),
    monthAlimtalk: Number(row.month_alimtalk ?? 0),
    monthSms: Number(row.month_sms ?? 0),
    monthFailed: Number(row.month_failed ?? 0),
    monthSkipped: Number(row.month_skipped ?? 0),
  }
}

export type PlatformCenter = {
  id: string
  name: string
  slug: string
  status: string
  plan_code: string | null
  contactEmail: string | null
  contactPhone: string | null
  member_count: number
  trainer_count: number
  servicePeriod: CenterServicePeriod
  requestedServiceStartsAt: string | null
  betaTrial: boolean
  created_at: string
  notificationsEnabled: boolean
  messageCredits: MessageCreditSummary | null
}

export type CreateCenterInput = {
  name: string
  slug: string
  adminUsername: string
  adminPassword: string
  planCode?: string
  contactEmail?: string
  contactPhone?: string
  serviceStartsAt?: string
  serviceEndsAt?: string
  operationalType?: CenterOperationalType
}

export type CreateCenterResult = {
  centerId: string
  centerSlug: string
  centerName: string
  adminUsername: string
}

function requirePlatformToken(): string {
  const session = getPlatformSession()
  if (!session?.token) {
    throw new Error('플랫폼 로그인이 필요합니다.')
  }
  return session.token
}

function parseCenterList(data: Json): PlatformCenter[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const row = data as Record<string, Json | undefined>
  if (row.ok !== true || !Array.isArray(row.centers)) return []

  return row.centers
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const c = item as Record<string, Json | undefined>
      const id = c.id != null ? String(c.id) : ''
      const name = c.name != null ? String(c.name) : ''
      const slug = c.slug != null ? String(c.slug) : ''
      if (!id || !name || !slug) return null
      return {
        id,
        name,
        slug,
        status: c.status != null ? String(c.status) : 'active',
        plan_code: c.plan_code != null ? String(c.plan_code) : null,
        contactEmail:
          c.contact_email != null ? String(c.contact_email) : null,
        contactPhone:
          c.contact_phone != null ? String(c.contact_phone) : null,
        member_count: typeof c.member_count === 'number' ? c.member_count : 0,
        trainer_count:
          typeof c.trainer_count === 'number' ? c.trainer_count : 0,
        servicePeriod: parseServicePeriod({
          service_starts_at: c.service_starts_at,
          service_ends_at: c.service_ends_at,
          service_period_ok: c.service_period_ok,
        }),
        requestedServiceStartsAt:
          c.requested_service_starts_at != null
            ? String(c.requested_service_starts_at)
            : null,
        betaTrial: c.beta_trial === true,
        created_at: c.created_at != null ? String(c.created_at) : '',
        notificationsEnabled: c.notifications_enabled === true,
        messageCredits: parseMessageCredits(c.message_credits),
      }
    })
    .filter((c): c is PlatformCenter => c !== null)
}

export async function fetchPlatformCenters(): Promise<PlatformCenter[]> {
  const { data, error } = await supabase.rpc('list_centers_for_platform', {
    p_session_token: requirePlatformToken(),
  })

  if (error) throw error
  if (data == null) return []
  return parseCenterList(data)
}

export async function createPlatformCenter(
  input: CreateCenterInput,
): Promise<CreateCenterResult> {
  const { data, error } = await supabase.rpc('create_center', {
    p_session_token: requirePlatformToken(),
    p_name: input.name.trim(),
    p_slug: input.slug.trim().toLowerCase(),
    p_admin_username: input.adminUsername.trim().toLowerCase(),
    p_admin_password: input.adminPassword,
    p_plan_code: input.planCode ?? 'starter',
    p_contact_email: input.contactEmail?.trim() || null,
    p_contact_phone: input.contactPhone?.trim() || null,
    p_service_starts_at: input.serviceStartsAt || null,
    p_service_ends_at: input.serviceEndsAt || null,
    p_operational_type: input.operationalType ?? 'pt',
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 생성에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'unauthorized':
        throw new Error('플랫폼 권한이 없습니다. 다시 로그인해 주세요.')
      case 'slug_taken':
        throw new Error('이미 사용 중인 센터 코드입니다.')
      case 'invalid_slug':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '센터 코드 형식이 올바르지 않습니다.',
        )
      case 'invalid_admin_password':
        throw new Error('관리자 비밀번호는 4자 이상이어야 합니다.')
      case 'invalid_phone':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '연락처 형식이 올바르지 않습니다.',
        )
      case 'invalid_service_period':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '이용 기간이 올바르지 않습니다.',
        )
      default:
        throw new Error('센터 생성에 실패했습니다.')
    }
  }

  const centerId = row.center_id != null ? String(row.center_id) : ''
  const centerSlug = row.center_slug != null ? String(row.center_slug) : ''
  const centerName = row.center_name != null ? String(row.center_name) : ''
  const adminUsername =
    row.admin_username != null ? String(row.admin_username) : ''

  if (!centerId || !centerSlug) {
    throw new Error('센터 생성 응답이 올바르지 않습니다.')
  }

  return { centerId, centerSlug, centerName, adminUsername }
}

export async function deletePlatformCenter(
  centerId: string,
  confirmSlug: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('delete_center', {
    p_session_token: requirePlatformToken(),
    p_center_id: centerId,
    p_confirm_slug: confirmSlug.trim().toLowerCase(),
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 삭제에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'protected_center':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '이 센터는 삭제할 수 없습니다.',
        )
      case 'slug_mismatch':
        throw new Error('센터 코드 확인이 일치하지 않습니다.')
      case 'unauthorized':
        throw new Error('플랫폼 권한이 없습니다.')
      default:
        throw new Error('센터 삭제에 실패했습니다.')
    }
  }
}

export async function suspendPlatformCenter(centerId: string): Promise<void> {
  const { data, error } = await supabase.rpc('suspend_center', {
    p_session_token: requirePlatformToken(),
    p_center_id: centerId,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 정지에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    throw new Error('센터 정지에 실패했습니다.')
  }
}

export async function updatePlatformCenterServicePeriod(
  centerId: string,
  input: {
    startsAt: string | null
    endsAt: string | null
    reactivate?: boolean
  },
): Promise<CenterServicePeriod> {
  const { data, error } = await supabase.rpc('update_center_service_period', {
    p_session_token: requirePlatformToken(),
    p_center_id: centerId,
    p_service_starts_at: input.startsAt,
    p_service_ends_at: input.endsAt,
    p_reactivate: input.reactivate ?? true,
  })

  if (error) throw error

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('이용 기간 저장에 실패했습니다.')
  }

  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    switch (row.error) {
      case 'unauthorized':
        throw new Error('플랫폼 권한이 없습니다.')
      case 'not_found':
        throw new Error('센터를 찾을 수 없습니다.')
      case 'invalid_range':
        throw new Error(
          row.message != null
            ? String(row.message)
            : '이용 기간이 올바르지 않습니다.',
        )
      default:
        throw new Error('이용 기간 저장에 실패했습니다.')
    }
  }

  return parseServicePeriod({
    service_starts_at: row.service_starts_at,
    service_ends_at: row.service_ends_at,
    service_period_ok: row.service_period_ok,
  })
}
