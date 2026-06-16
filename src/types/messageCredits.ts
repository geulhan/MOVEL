export type MessageCreditSummary = {
  balance: number
  totalPurchased: number
  totalUsed: number
  monthUsed: number
  monthAlimtalk: number
  monthSms: number
  monthFailed: number
  monthSkipped: number
}

export type MessageLogIssue = {
  id: string
  templateKey: string
  status: 'failed' | 'skipped'
  errorMessage: string | null
  createdAt: string
}

export type CenterMessageDashboard = {
  notificationsEnabled: boolean
  credits: MessageCreditSummary
  recentIssues: MessageLogIssue[]
}

function parseSummary(raw: unknown): MessageCreditSummary {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  return {
    balance: Number(row.balance ?? 0),
    totalPurchased: Number(row.total_purchased ?? row.totalPurchased ?? 0),
    totalUsed: Number(row.total_used ?? row.totalUsed ?? 0),
    monthUsed: Number(row.month_used ?? row.monthUsed ?? 0),
    monthAlimtalk: Number(row.month_alimtalk ?? row.monthAlimtalk ?? 0),
    monthSms: Number(row.month_sms ?? row.monthSms ?? 0),
    monthFailed: Number(row.month_failed ?? row.monthFailed ?? 0),
    monthSkipped: Number(row.month_skipped ?? row.monthSkipped ?? 0),
  }
}

function parseRecentIssues(raw: unknown): MessageLogIssue[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const row = item as Record<string, unknown>
      const id = row.id != null ? String(row.id) : ''
      if (!id) return null
      const status = row.status === 'failed' ? 'failed' : 'skipped'
      return {
        id,
        templateKey: String(row.template_key ?? ''),
        status,
        errorMessage:
          row.error_message != null ? String(row.error_message) : null,
        createdAt: String(row.created_at ?? ''),
      }
    })
    .filter((item): item is MessageLogIssue => item !== null)
}

export function parseCenterMessageDashboard(data: unknown): CenterMessageDashboard {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('메시지 정보를 불러올 수 없습니다.')
  }

  const row = data as Record<string, unknown>
  if (row.ok !== true) {
    throw new Error(
      row.message != null
        ? String(row.message)
        : row.error != null
          ? String(row.error)
          : '메시지 정보를 불러올 수 없습니다.',
    )
  }

  return {
    notificationsEnabled: row.notifications_enabled === true,
    credits: parseSummary(row.credits),
    recentIssues: parseRecentIssues(row.recent_issues),
  }
}
