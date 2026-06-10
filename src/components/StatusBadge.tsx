import type { MemberStatus } from '../types/database'
import { MEMBER_STATUS_LABELS } from '../types/database'

const styles: Record<MemberStatus, string> = {
  active: 'bg-gold/25 text-charcoal border-gold/50',
  dormant: 'bg-cream text-charcoal/70 border-gold/30',
  terminated: 'bg-charcoal/8 text-charcoal/50 border-charcoal/15',
}

type Props = {
  status: MemberStatus
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {MEMBER_STATUS_LABELS[status]}
    </span>
  )
}
