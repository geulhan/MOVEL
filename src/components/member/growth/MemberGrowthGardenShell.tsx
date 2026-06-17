import { useState } from 'react'
import { MemberGardenSection } from '../garden/MemberGardenSection'
import { MemberGrowthSection } from './MemberGrowthSection'

type SubTab = 'growth' | 'garden'

type Props = {
  memberId: string
  refreshToken?: number
}

export function MemberGrowthGardenShell({ memberId, refreshToken = 0 }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('growth')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-gold/20 bg-white p-1">
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
          onClick={() => setSubTab('garden')}
          className={`rounded-lg py-2.5 text-sm font-bold transition ${
            subTab === 'garden'
              ? 'bg-charcoal text-cream shadow-sm'
              : 'text-charcoal hover:bg-cream/80'
          }`}
        >
          정원
        </button>
      </div>

      {subTab === 'growth' ? (
        <MemberGrowthSection memberId={memberId} refreshToken={refreshToken} />
      ) : (
        <MemberGardenSection memberId={memberId} refreshToken={refreshToken} />
      )}
    </div>
  )
}
