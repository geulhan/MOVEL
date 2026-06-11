export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProfileField({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl bg-cream/60 px-3 py-2.5">
      <dt className="text-xs font-medium text-charcoal/50">{label}</dt>
      <dd
        className={`mt-0.5 truncate text-sm font-semibold ${
          highlight ? 'text-red-600' : 'text-charcoal'
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}

export function PtUsageBar({ used, total }: { used: number; total: number }) {
  const rate = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-charcoal/60">PT 사용률</span>
        <span className="font-bold text-charcoal tabular-nums">{rate}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted tabular-nums">
        사용 {used}회 / 등록 {total}회
      </p>
    </div>
  )
}
