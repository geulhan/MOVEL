import { useCallback, useEffect, useState } from 'react'
import { formatCurrency } from '../../api/members'
import {
  centerPassStatusLabel,
  fetchMemberCenterPasses,
  formatCenterPassPeriod,
  type CenterPass,
} from '../../api/centerPasses'
import { cardClass } from '../../styles/theme'

type Props = {
  memberId: string
  refreshToken?: number
}

export function MemberCenterPassSection({ memberId, refreshToken }: Props) {
  const [passes, setPasses] = useState<CenterPass[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPasses(await fetchMemberCenterPasses(memberId))
    } catch {
      setPasses([])
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  const activePass = passes.find((pass) => pass.status === 'active') ?? null
  const upcomingPass = passes.find((pass) => pass.status === 'scheduled') ?? null

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <h4 className="text-sm font-bold text-charcoal">센터 이용권</h4>
      <p className="mt-1 text-xs text-muted">
        PT 수업과 별개인 센터 시설 기간권입니다. 추후 판매·배포 시 이곳에서
        확인할 수 있습니다.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">불러오는 중…</p>
      ) : activePass ? (
        <div className="mt-4 rounded-xl border border-gold/35 bg-gold/10 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
            이용 중
          </p>
          <p className="mt-1 text-lg font-bold text-charcoal">{activePass.label}</p>
          <p className="mt-1 text-sm text-muted">
            {formatCenterPassPeriod(activePass)}
          </p>
          <p className="mt-2 text-xs text-charcoal/70">
            상태: {centerPassStatusLabel(activePass.status)}
          </p>
        </div>
      ) : upcomingPass ? (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
          <p className="font-semibold">{upcomingPass.label}</p>
          <p className="mt-1">
            시작 예정: {upcomingPass.starts_at} ·{' '}
            {centerPassStatusLabel(upcomingPass.status)}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-gold/35 bg-cream/40 px-4 py-4 text-sm text-muted">
          현재 등록된 센터 이용권이 없습니다.
        </div>
      )}

      {passes.length > 1 && (
        <ul className="mt-4 space-y-2 text-xs text-muted">
          {passes.slice(0, 3).map((pass) => (
            <li
              key={pass.id}
              className="flex items-center justify-between rounded-lg border border-gold/15 px-3 py-2"
            >
              <span className="font-medium text-charcoal">{pass.label}</span>
              <span>
                {centerPassStatusLabel(pass.status)}
                {pass.amount != null && pass.amount > 0
                  ? ` · ${formatCurrency(Number(pass.amount))}`
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
