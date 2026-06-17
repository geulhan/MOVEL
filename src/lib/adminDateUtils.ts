export function firstDayOfMonth(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function lastDayOfMonth(date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth()
  const last = new Date(y, m + 1, 0)
  const mm = String(last.getMonth() + 1).padStart(2, '0')
  const dd = String(last.getDate()).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}
