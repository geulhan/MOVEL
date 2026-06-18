import { useState } from 'react'
import { MemberSeasonSection } from '../season/MemberSeasonSection'
import { ExerciseVillagePage } from '../world/ExerciseVillagePage'

type SubTab = 'hub' | 'season'

type Props = {
  memberId: string
  refreshToken?: number
}

export function MemberGrowthHubShell({ memberId, refreshToken = 0 }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('hub')

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-gold/20 bg-white p-1">
        <button
          type="button"
          onClick={() => setSubTab('hub')}
          className={`rounded-lg py-2 text-sm font-bold transition ${
            subTab === 'hub'
              ? 'bg-charcoal text-cream shadow-sm'
              : 'text-charcoal hover:bg-cream/80'
          }`}
        >
          내 마을
        </button>
        <button
          type="button"
          onClick={() => setSubTab('season')}
          className={`rounded-lg py-2 text-sm font-bold transition ${
            subTab === 'season'
              ? 'bg-charcoal text-cream shadow-sm'
              : 'text-charcoal hover:bg-cream/80'
          }`}
        >
          시즌
        </button>
      </div>

      {subTab === 'hub' && (
        <ExerciseVillagePage memberId={memberId} refreshToken={refreshToken} />
      )}
      {subTab === 'season' && (
        <MemberSeasonSection memberId={memberId} refreshToken={refreshToken} />
      )}
    </div>
  )
}
