export function formatSessionsLabel(total: number, remaining: number): string {
  return `등록 ${total}회 | 잔여 ${remaining}회`
}

export function getRemainingSessionsClass(remaining: number): string {
  if (remaining <= 1) return 'font-semibold text-red-600'
  if (remaining <= 3) return 'font-semibold text-orange-600'
  if (remaining <= 5) return 'font-semibold text-yellow-600'
  return 'font-medium text-charcoal/80'
}
