import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/admin/PageHeader'
import { ChallengesAdminPanel } from '../../components/admin/motionhub/ChallengesAdminPanel'
import { SeasonPassAdminPanel } from '../../components/admin/motionhub/SeasonPassAdminPanel'
import RewardsPage from './RewardsPage'

type MotionHubTab = 'mileage' | 'challenges' | 'season'

const TAB_LABELS: Record<MotionHubTab, string> = {
  mileage: '마일리지',
  challenges: '챌린지',
  season: '시즌 패스',
}

function parseTab(value: string | null): MotionHubTab {
  if (value === 'challenges' || value === 'season' || value === 'mileage') {
    return value
  }
  return 'mileage'
}

export default function MotionHubAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<MotionHubTab>(() => parseTab(searchParams.get('tab')))

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  function selectTab(next: MotionHubTab) {
    setTab(next)
    setSearchParams({ tab: next }, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="성장 허브 운영"
        description="마일리지, 센터 챌린지, 시즌 패스를 한곳에서 관리합니다. 회원 앱의 성장 허브와 연동됩니다."
      />

      <nav className="chip-scroll -mx-1 px-1">
        {(Object.keys(TAB_LABELS) as MotionHubTab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`chip ${tab === id ? 'chip-active' : 'chip-inactive'}`}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </nav>

      {tab === 'mileage' && <RewardsPage embedded />}
      {tab === 'challenges' && <ChallengesAdminPanel />}
      {tab === 'season' && <SeasonPassAdminPanel />}
    </div>
  )
}
