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

/** 회원 앱 마을·게임 공개 전까지 관리자는 마일리지 설정만 노출 */
const MOTIONHUB_GAME_ADMIN_ENABLED = false

function parseTab(value: string | null): MotionHubTab {
  if (!MOTIONHUB_GAME_ADMIN_ENABLED) return 'mileage'
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
        title="마일리지"
        description="MOVE MILE 적립·사용 규칙과 재등록 결제 연동을 관리합니다. 챌린지·시즌 패스는 게임 오픈 후 제공됩니다."
      />

      {MOTIONHUB_GAME_ADMIN_ENABLED && (
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
      )}

      {tab === 'mileage' && <RewardsPage embedded />}
      {MOTIONHUB_GAME_ADMIN_ENABLED && tab === 'challenges' && <ChallengesAdminPanel />}
      {MOTIONHUB_GAME_ADMIN_ENABLED && tab === 'season' && <SeasonPassAdminPanel />}
    </div>
  )
}
