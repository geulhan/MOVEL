import { useCallback, useEffect, useState } from 'react'
import { fetchRewardEarnRules } from '../api/rewards'
import {
  buildMemberRewardGuide,
  type MemberRewardGuide,
} from '../lib/rewardGuide'
import { cardClass } from '../styles/theme'

export function MemberRewardGuideSection() {
  const [guide, setGuide] = useState<MemberRewardGuide | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rules = await fetchRewardEarnRules()
      setGuide(buildMemberRewardGuide(rules))
    } catch {
      setGuide(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="border-b border-gold/20 bg-cream/50 px-5 py-4 sm:px-6">
        <h4 className="text-sm font-bold text-charcoal">적립 기준 안내</h4>
        <p className="mt-1 text-xs text-muted">
          MOVE SCORE · MOVE MILE 을 받을 수 있는 활동과 기준입니다.
        </p>
      </div>

      {loading ? (
        <p className="p-6 text-center text-sm text-muted">불러오는 중…</p>
      ) : !guide ? (
        <p className="p-6 text-center text-sm text-muted">
          적립 기준을 불러오지 못했습니다.
        </p>
      ) : (
        <div className="space-y-5 p-5 sm:p-6">
          <div className="overflow-x-auto rounded-xl border border-gold/20">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gold/15 bg-cream/60 text-left text-xs text-muted">
                  <th className="px-3 py-2.5 font-semibold">활동</th>
                  <th className="px-3 py-2.5 font-semibold">SCORE</th>
                  <th className="px-3 py-2.5 font-semibold">MILE</th>
                </tr>
              </thead>
              <tbody>
                {guide.earnRows.map((row) => (
                  <tr key={row.key} className="border-b border-gold/10">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-charcoal">{row.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">
                        {row.description}
                      </p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-bold tabular-nums text-charcoal">
                      {row.score}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-bold tabular-nums text-gold-dark">
                      {row.mile}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h5 className="text-xs font-bold uppercase tracking-wide text-gold-dark">
              SCORE 등급
            </h5>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {guide.tierRows.map((row) => (
                <li
                  key={row.tier}
                  className="flex items-center justify-between rounded-lg border border-gold/20 bg-white px-3 py-2 text-xs"
                >
                  <span className="font-bold text-charcoal">{row.tier}</span>
                  <span className="text-muted">{row.range}</span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="space-y-1.5 text-xs leading-relaxed text-muted">
            {guide.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="text-gold-dark">·</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
