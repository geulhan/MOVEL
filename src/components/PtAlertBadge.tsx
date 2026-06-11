import { getPtAlertLevel } from '../utils/renewal'
import type { Member } from '../types/database'

const styles: Record<
  NonNullable<ReturnType<typeof getPtAlertLevel>>,
  { className: string; label: string }
> = {
  warning: {
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300/60',
    label: '주의',
  },
  urgent: {
    className: 'bg-orange-100 text-orange-800 border-orange-300/60',
    label: '긴급',
  },
  critical: {
    className: 'bg-red-100 text-red-800 border-red-300/60',
    label: '필요',
  },
}

type Props = {
  member: Member
}

export function PtAlertBadge({ member }: Props) {
  const level = getPtAlertLevel(
    member.remaining_sessions,
    member.status,
    member.total_sessions,
  )
  if (!level) return null

  const { className, label } = styles[level]

  return (
    <span
      title={
        level === 'critical'
          ? '재등록 필요'
          : level === 'urgent'
            ? '긴급 관리'
            : '재등록 주의'
      }
      className={`inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  )
}
