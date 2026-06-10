import { getRemainingSessionsClass } from '../utils/sessions'

type Props = {
  total: number
  remaining: number
}

export function SessionCount({ total, remaining }: Props) {
  const remainingClass = getRemainingSessionsClass(remaining)

  return (
    <span className="whitespace-nowrap text-sm">
      <span className="text-charcoal/65">등록 {total}회</span>
      <span className="mx-1.5 text-gold/60">|</span>
      <span className={remainingClass}>잔여 {remaining}회</span>
    </span>
  )
}
