import { formatDate } from '../../../api/members'
import { cardClass } from '../../../styles/theme'
import type { ActiveCenterChallenge } from '../../../types/challenges'
import { CHALLENGE_TYPE_LABELS } from '../../../types/challenges'

type Props = {
  challenges: ActiveCenterChallenge[]
}

function progressPercent(challenge: ActiveCenterChallenge): number {
  const target = challenge.progress_target || challenge.target_value
  if (target <= 0) return 0
  return Math.min(100, Math.round((challenge.current_value / target) * 100))
}

function progressBar(filled: number, total = 10): string {
  const blocks = Math.max(1, total)
  const done = Math.round((filled / 100) * blocks)
  return '█'.repeat(done) + '░'.repeat(blocks - done)
}

export function MemberChallengesSection({ challenges }: Props) {
  if (challenges.length === 0) return null

  return (
    <section className={`${cardClass} p-4`}>
      <h3 className="text-base font-semibold text-charcoal">현재 진행 중인 챌린지</h3>
      <p className="mt-1 text-xs text-muted">센터 챌린지를 달성하면 추가 성장 보상을 받아요</p>
      <ul className="mt-3 space-y-4">
        {challenges.map((challenge) => {
          const target = challenge.progress_target || challenge.target_value
          const percent = progressPercent(challenge)
          const typeLabel = CHALLENGE_TYPE_LABELS[challenge.challenge_type] ?? '챌린지'

          return (
            <li
              key={challenge.id}
              className={`rounded-xl border px-3 py-3 ${
                challenge.is_completed
                  ? 'border-[#5A9E6F]/40 bg-[#5A9E6F]/5'
                  : 'border-gold/20 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-charcoal">{challenge.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {typeLabel} · {formatDate(challenge.start_date)} ~{' '}
                    {formatDate(challenge.end_date)}
                  </p>
                </div>
                {challenge.is_completed && (
                  <span className="shrink-0 text-[10px] font-bold text-[#5A9E6F]">
                    {challenge.reward_claimed ? '완료' : '달성!'}
                  </span>
                )}
              </div>

              <div
                className="mt-2 overflow-hidden rounded-full bg-charcoal/10"
                aria-hidden
              >
                <div
                  className="h-2 rounded-full bg-[#5A9E6F] transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="mt-1.5 font-mono text-xs tracking-tight text-charcoal/80">
                {progressBar(percent)}
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums text-charcoal">
                {challenge.current_value} / {target}
              </p>

              <p className="mt-1.5 text-[11px] text-charcoal/70">
                보상: +{challenge.reward_growth} 성장치
                {challenge.reward_acorn > 0 ? ` · +${challenge.reward_acorn} 도토리` : ''}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
