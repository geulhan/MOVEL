import { Link } from 'react-router-dom'

const linkClass =
  'inline-flex rounded-lg border border-charcoal/12 bg-white px-2.5 py-1 text-xs font-semibold text-charcoal transition hover:border-gold/40 hover:bg-cream/60'

const journalWriteClass =
  'inline-flex rounded-lg border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs font-semibold text-charcoal transition hover:bg-gold/25'

type Props = {
  memberId: string
  returnTo: string
  journalDate?: string
  showJournal?: boolean
  journalNeedsWrite?: boolean
}

export function MemberScheduleActionLinks({
  memberId,
  returnTo,
  journalDate,
  showJournal = true,
  journalNeedsWrite = false,
}: Props) {
  const returnQuery = `returnTo=${encodeURIComponent(returnTo)}`
  const journalParams = new URLSearchParams({ returnTo })
  if (journalDate) journalParams.set('date', journalDate)
  const journalTo = `/admin/member/${memberId}/journal?${journalParams.toString()}`

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      <Link
        to={`/admin/member/${memberId}/records?${returnQuery}`}
        className={linkClass}
      >
        기록
      </Link>
      {showJournal ? (
        <Link
          to={journalTo}
          className={journalNeedsWrite ? journalWriteClass : linkClass}
        >
          {journalNeedsWrite ? '운동일지 작성' : '운동일지'}
        </Link>
      ) : null}
    </div>
  )
}
