import { ALIMTALK_BRAND_HEADER } from './alimtalkBrand.ts'

export type TemplateKey =
  | 'welcome'
  | 'payment_done'
  | 'renewal'
  | 'step_verification_result'
  | 'pt_reminder'

export type MemberRow = {
  id: string
  name: string
  phone: string
  expires_at: string | null
  remaining_sessions: number
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

export function buildTemplateVariables(
  templateKey: TemplateKey,
  member: MemberRow,
  config: { siteUrl: string; centerSlug?: string; centerName?: string },
  extra: {
    amount?: number
    sessions?: number
    daysLeft?: number
    approved?: boolean
    reason?: string
    scheduledAt?: string
    trainerName?: string
  } = {},
): Record<string, string> {
  const slug = config.centerSlug?.trim().toLowerCase() ?? ''
  const portalUrl = slug
    ? `${config.siteUrl}/member?center=${encodeURIComponent(slug)}`
    : `${config.siteUrl}/member`
  const centerName = config.centerName?.trim() || '센터'
  const base = {
    '#{brandHeader}': ALIMTALK_BRAND_HEADER,
    '#{centerName}': centerName,
    '#{name}': member.name,
    '#{portalUrl}': portalUrl,
  }

  switch (templateKey) {
    case 'welcome':
      return {
        ...base,
        '#{phone}': member.phone,
      }
    case 'payment_done':
      return {
        ...base,
        '#{amount}': formatCurrency(extra.amount ?? 0),
        '#{sessions}': String(extra.sessions ?? 0),
      }
    case 'renewal':
      return {
        ...base,
        '#{expiresAt}': formatKoreanDate(member.expires_at),
        '#{daysLeft}': String(extra.daysLeft ?? 0),
        '#{remainingSessions}': String(member.remaining_sessions),
      }
    case 'step_verification_result':
      return {
        ...base,
        '#{result}': extra.approved ? '승인' : '반려',
        '#{reason}': extra.reason?.trim() || (extra.approved ? '인증 완료' : '-'),
      }
    case 'pt_reminder':
      return {
        ...base,
        '#{scheduledAt}': extra.scheduledAt ?? '-',
        '#{trainerName}': extra.trainerName?.trim() || '담당 트레이너',
      }
    default:
      return {}
  }
}

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  welcome: '신규 가입 환영',
  payment_done: '결제 완료',
  renewal: '갱신 안내',
  step_verification_result: '만보 인증 결과',
  pt_reminder: 'PT 예약 리마인더',
}
