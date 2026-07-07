import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/admin/PageHeader'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import { isClassFeatureEnabled } from '../../types/centerFeatures'
import { btnGold } from '../../styles/theme'
import ClassesPage from './ClassesPage'
import SchedulePage from './SchedulePage'

type TabId = 'pt' | 'class'

export default function ReservationsPage() {
  const [searchParams] = useSearchParams()
  const memberId = searchParams.get('memberId') ?? undefined
  const { features } = useCenterFeatures()
  const showPt = features.pt
  const showClass = isClassFeatureEnabled(features)

  const defaultTab = useMemo<TabId>(() => {
    if (searchParams.get('tab') === 'class' && showClass) return 'class'
    if (showPt) return 'pt'
    return 'class'
  }, [searchParams, showClass, showPt])

  const [tab, setTab] = useState<TabId>(defaultTab)

  useEffect(() => {
    setTab(defaultTab)
  }, [defaultTab])

  if (!showPt && !showClass) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="예약"
          description="PT 또는 클래스 기능이 꺼져 있습니다."
          helpText={PAGE_HELP.schedule}
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-center">
          <p className="text-sm text-charcoal">
            예약 메뉴를 사용하려면 센터 설정에서 PT 또는 클래스 기능을 활성화해 주세요.
          </p>
          <Link to="/admin/settings" className={`${btnGold} mt-4 inline-flex`}>
            센터 설정으로 이동
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="예약"
        description="PT 일정과 클래스 예약을 한곳에서 관리합니다."
        helpText={PAGE_HELP.reservations}
      />

      {memberId && (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          회원 필터 적용 중 ·{' '}
          <Link
            to={`/admin/member/${memberId}`}
            className="font-semibold underline-offset-2 hover:underline"
          >
            회원 상세 보기
          </Link>
        </p>
      )}

      {showPt && showClass && (
        <nav className="chip-scroll -mx-1 px-1">
          <button
            type="button"
            onClick={() => setTab('pt')}
            className={`chip ${tab === 'pt' ? 'chip-active' : 'chip-inactive'}`}
          >
            PT 일정
          </button>
          <button
            type="button"
            onClick={() => setTab('class')}
            className={`chip ${tab === 'class' ? 'chip-active' : 'chip-inactive'}`}
          >
            클래스
          </button>
        </nav>
      )}

      {tab === 'pt' && showPt ? (
        <SchedulePage embedded highlightMemberId={memberId} />
      ) : showClass ? (
        <ClassesPage embedded initialMemberId={memberId} />
      ) : (
        <SchedulePage embedded highlightMemberId={memberId} />
      )}
    </div>
  )
}
