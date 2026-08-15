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
    <div className={subTab === 'hub' ? 'space-y-2' : 'space-y-2'}>
      <div className="overflow-hidden rounded-xl border border-[#5a9e6f]/25 bg-gradient-to-b from-[#e8f5e4] to-white p-1 shadow-sm">
        <p className="px-2 pt-1.5 text-center text-[10px] font-medium text-[#2d6a3e]/80">
          운동 습관이 보이는 나만의 마을
        </p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setSubTab('hub')}
            className={`rounded-lg py-2 text-xs font-bold transition ${
              subTab === 'hub'
                ? 'bg-[#2d4a28] text-cream shadow-md'
                : 'bg-white/70 text-charcoal hover:bg-white'
            }`}
          >
            🏡 내 운동 세계
          </button>
          <button
            type="button"
            onClick={() => setSubTab('season')}
            className={`rounded-lg py-2 text-xs font-bold transition ${
              subTab === 'season'
                ? 'bg-[#2d4a28] text-cream shadow-md'
                : 'bg-white/70 text-charcoal hover:bg-white'
            }`}
          >
            🌸 시즌
          </button>
        </div>
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
