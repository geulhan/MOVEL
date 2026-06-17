import { useState } from 'react'
import { MemberSeasonSection } from '../season/MemberSeasonSection'
import { MemberVillageSection } from '../village/MemberVillageSection'
import { MemberGrowthSection } from './MemberGrowthSection'

type SubTab = 'growth' | 'village' | 'season'

type Props = {
  memberId: string
  refreshToken?: number
}

export function MemberGrowthGardenShell({ memberId, refreshToken = 0 }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('growth')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-gold/20 bg-white p-1">
        <button
          type="button"
          onClick={() => setSubTab('growth')}
          className={`rounded-lg py-2.5 text-sm font-bold transition ${
            subTab === 'growth'
              ? 'bg-charcoal text-cream shadow-sm'
              : 'text-charcoal hover:bg-cream/80'
          }`}
        >
          성장
        </button>
        <button
          type="button"
          onClick={() => setSubTab('village')}
          className={`rounded-lg py-2.5 text-sm font-bold transition ${
            subTab === 'village'
              ? 'bg-charcoal text-cream shadow-sm'
              : 'text-charcoal hover:bg-cream/80'
          }`}
        >
          마을
        </button>
        <button
          type="button"
          onClick={() => setSubTab('season')}
          className={`rounded-lg py-2.5 text-sm font-bold transition ${
            subTab === 'season'
              ? 'bg-charcoal text-cream shadow-sm'
              : 'text-charcoal hover:bg-cream/80'
          }`}
        >
          시즌
        </button>
      </div>

      {subTab === 'growth' && (
        <MemberGrowthSection memberId={memberId} refreshToken={refreshToken} />
      )}
      {subTab === 'village' && (
        <MemberVillageSection memberId={memberId} refreshToken={refreshToken} />
      )}
      {subTab === 'season' && (
        <MemberSeasonSection memberId={memberId} refreshToken={refreshToken} />
      )}
    </div>
  )
}
