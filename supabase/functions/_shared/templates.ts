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

  switch (templateKey) {
    case 'welcome':
      return {
        '#{name}': member.name,
        '#{centerName}': centerName,
        '#{portalUrl}': portalUrl,
        '#{phone}': member.phone,
      }
    case 'payment_done':
      return {
        '#{name}': member.name,
        '#{centerName}': centerName,
        '#{amount}': formatCurrency(extra.amount ?? 0),
        '#{sessions}': String(extra.sessions ?? 0),
        '#{portalUrl}': portalUrl,
      }
    case 'renewal':
      return {
        '#{name}': member.name,
        '#{centerName}': centerName,
        '#{expiresAt}': formatKoreanDate(member.expires_at),
        '#{daysLeft}': String(extra.daysLeft ?? 0),
        '#{remainingSessions}': String(member.remaining_sessions),
        '#{portalUrl}': portalUrl,
      }
    case 'step_verification_result':
      return {
        '#{name}': member.name,
        '#{centerName}': centerName,
        '#{result}': extra.approved ? '승인' : '반려',
        '#{reason}': extra.reason?.trim() || (extra.approved ? '인증 완료' : '-'),
        '#{portalUrl}': portalUrl,
      }
    case 'pt_reminder':
      return {
        '#{name}': member.name,
        '#{centerName}': centerName,
        '#{scheduledAt}': extra.scheduledAt ?? '-',
        '#{trainerName}': extra.trainerName?.trim() || '담당 트레이너',
        '#{portalUrl}': portalUrl,
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
