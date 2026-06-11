export type TemplateKey = 'welcome' | 'payment_done' | 'renewal'

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

export function buildTemplateVariables(
  templateKey: TemplateKey,
  member: MemberRow,
  config: { siteUrl: string },
  extra: {
    amount?: number
    sessions?: number
    daysLeft?: number
  } = {},
): Record<string, string> {
  const portalUrl = `${config.siteUrl}/member`

  switch (templateKey) {
    case 'welcome':
      return {
        '#{name}': member.name,
        '#{portalUrl}': portalUrl,
        '#{phone}': member.phone,
      }
    case 'payment_done':
      return {
        '#{name}': member.name,
        '#{amount}': formatCurrency(extra.amount ?? 0),
        '#{sessions}': String(extra.sessions ?? 0),
        '#{portalUrl}': portalUrl,
      }
    case 'renewal':
      return {
        '#{name}': member.name,
        '#{expiresAt}': formatKoreanDate(member.expires_at),
        '#{daysLeft}': String(extra.daysLeft ?? 0),
        '#{remainingSessions}': String(member.remaining_sessions),
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
}
