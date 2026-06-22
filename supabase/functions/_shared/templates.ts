import { ALIMTALK_BRAND_HEADER } from './alimtalkBrand.ts'
import type { AlimtalkTemplateKey } from './alimtalkTemplateRegistry.ts'

export type TemplateKey = AlimtalkTemplateKey

export type MemberRow = {
  id: string
  name: string
  phone: string
  expires_at: string | null
  remaining_sessions: number
}

export type TemplateVariableContext = {
  siteUrl: string
  centerSlug?: string
  centerName?: string
  memberName?: string
  trainerName?: string
  scheduleDate?: string
  className?: string
  productName?: string
  amount?: number
  sessions?: number
  remainingCount?: number
  expireDate?: string
  scheduledAt?: string
  daysLeft?: number
  reportWeek?: string
  activeMembers?: number
  newMembers?: number
  approved?: boolean
  reason?: string
}

export function formatKoreanDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('T')[0].split('-')
  if (!y || !m || !d) return dateStr
  return `${y}.${m}.${d}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount)) + '원'
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

function buildMemberPortalUrl(config: {
  siteUrl: string
  centerSlug?: string
}): string {
  const slug = config.centerSlug?.trim().toLowerCase() ?? ''
  return slug
    ? `${config.siteUrl}/member?center=${encodeURIComponent(slug)}`
    : `${config.siteUrl}/member`
}

function buildCenterStartGuideUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/guide`
}

function baseVariables(
  config: { siteUrl: string; centerSlug?: string; centerName?: string },
  memberName: string,
): Record<string, string> {
  const centerName = config.centerName?.trim() || '센터'
  const memberPortalUrl = buildMemberPortalUrl(config)
  return {
    '#{brandHeader}': ALIMTALK_BRAND_HEADER,
    '#{centerName}': centerName,
    '#{memberName}': memberName,
    '#{name}': memberName,
    '#{portalUrl}': memberPortalUrl,
  }
}

/** 카카오/Solapi 템플릿 변수 매핑 (공통 + 템플릿별) */
export function buildTemplateVariables(
  templateKey: TemplateKey,
  member: MemberRow | null,
  config: { siteUrl: string; centerSlug?: string; centerName?: string },
  extra: TemplateVariableContext = {},
): Record<string, string> {
  const memberName =
    extra.memberName?.trim() || member?.name?.trim() || '회원'
  const base = baseVariables(config, memberName)

  const trainerName = extra.trainerName?.trim() || '담당 트레이너'
  const scheduleDate =
    extra.scheduleDate?.trim() ||
    (extra.scheduledAt ? formatScheduledAtKst(extra.scheduledAt) : '-')
  const className = extra.className?.trim() || '수업'
  const productName = extra.productName?.trim() || '수강권'
  const remainingCount = String(
    extra.remainingCount ?? member?.remaining_sessions ?? 0,
  )
  const expireDate =
    extra.expireDate?.trim() ||
    formatKoreanDate(member?.expires_at ?? null)

  switch (templateKey) {
    case 'member_signup_guide':
    case 'member_welcome':
    case 'welcome':
      return {
        '#{centerName}': config.centerName?.trim() || '센터',
      }
    case 'payment_completed':
    case 'payment_done':
      return {
        ...base,
        '#{amount}': formatCurrency(extra.amount ?? 0),
        '#{productName}': productName,
        '#{sessions}': String(extra.sessions ?? 0),
      }
    case 'schedule_reminder':
    case 'pt_reminder':
      return {
        ...base,
        '#{scheduleDate}': scheduleDate,
        '#{scheduledAt}': scheduleDate,
        '#{trainerName}': trainerName,
        '#{className}': className,
      }
    case 'schedule_changed':
    case 'schedule_cancelled':
      return {
        ...base,
        '#{scheduleDate}': scheduleDate,
        '#{trainerName}': trainerName,
        '#{className}': className,
      }
    case 'pt_remaining_3':
    case 'pt_remaining_1':
      return {
        ...base,
        '#{remainingCount}': remainingCount,
        '#{remainingSessions}': remainingCount,
      }
    case 'membership_expire_14':
    case 'membership_expire_7':
    case 'membership_expire_today':
    case 'renewal':
      return {
        ...base,
        '#{expireDate}': expireDate,
        '#{expiresAt}': expireDate,
        '#{remainingCount}': remainingCount,
        '#{remainingSessions}': remainingCount,
        '#{daysLeft}': String(extra.daysLeft ?? 0),
      }
    case 'step_verification_result':
      return {
        ...base,
        '#{result}': extra.approved ? '승인' : '반려',
        '#{reason}':
          extra.reason?.trim() || (extra.approved ? '인증 완료' : '-'),
      }
    case 'center_welcome': {
      const centerGuideUrl = buildCenterStartGuideUrl(config.siteUrl)
      return {
        '#{brandHeader}': ALIMTALK_BRAND_HEADER,
        '#{centerName}': config.centerName?.trim() || '센터',
        '#{guideUrl}': centerGuideUrl,
        '#{portalUrl}': centerGuideUrl,
      }
    }
    case 'weekly_report':
      return {
        '#{brandHeader}': ALIMTALK_BRAND_HEADER,
        '#{centerName}': config.centerName?.trim() || '센터',
        '#{reportWeek}': extra.reportWeek?.trim() || '-',
        '#{activeMembers}': String(extra.activeMembers ?? 0),
        '#{newMembers}': String(extra.newMembers ?? 0),
      }
    default:
      return base
  }
}

export { TEMPLATE_LABELS } from './alimtalkTemplateRegistry.ts'
