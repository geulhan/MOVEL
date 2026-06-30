import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  deductSession,
  fetchMembers,
  updateMemberStatus,
  updateMemberTrainer,
} from '../../api/members'
import { fetchTrainers } from '../../api/trainers'
import { PageHeader } from '../../components/admin/PageHeader'
import { CenterOnboardingPanel } from '../../components/admin/CenterOnboardingPanel'
import { isTrainerStaff } from '../../lib/adminPermissions'
import { getAdminSession } from '../../lib/adminSession'
import { MemberFilterBar } from '../../components/MemberFilterBar'
import { MemberForm } from '../../components/MemberForm'
import { MemberImportPanel } from '../../components/admin/MemberImportPanel'
import { MemberSearchCombobox } from '../../components/admin/MemberSearchCombobox'
import { MemberList } from '../../components/MemberList'
import { exportMembersExcel } from '../../lib/excelExport'
import { formatSupabaseError } from '../../lib/errors'
import { btnOutline } from '../../styles/theme'
import type { Member, MemberStatus, Trainer } from '../../types/database'
import { MEMBER_STATUS_LABELS } from '../../types/database'
import {
  applyRenewalFilter,
  computeRenewalStats,
  filterBySearch,
  isExpiringSoon,
  isExpiringWithin14Days,
  isRenewalPriorityMember,
  isRenewalTarget,
  isUnregisteredMember,
  type RenewalFilter,
} from '../../utils/renewal'

type MemberSortOption =
  | 'registered_desc'
  | 'registered_asc'
  | 'name_asc'
  | 'name_desc'
  | 'remaining_asc'
  | 'remaining_desc'

const SORT_OPTIONS: { value: MemberSortOption; label: string }[] = [
  { value: 'registered_desc', label: '등록순 (최신)' },
  { value: 'registered_asc', label: '등록순 (오래된)' },
  { value: 'name_asc', label: '이름순 (가나다)' },
  { value: 'name_desc', label: '이름순 (역순)' },
  { value: 'remaining_asc', label: '잔여횟수 (적은)' },
  { value: 'remaining_desc', label: '잔여횟수 (많은)' },
]

function sortMembers(members: Member[], sort: MemberSortOption): Member[] {
  const copy = [...members]
  switch (sort) {
    case 'name_asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    case 'name_desc':
      return copy.sort((a, b) => b.name.localeCompare(a.name, 'ko'))
    case 'registered_asc':
      return copy.sort((a, b) => a.registered_at.localeCompare(b.registered_at))
    case 'remaining_asc':
      return copy.sort((a, b) => a.remaining_sessions - b.remaining_sessions)
    case 'remaining_desc':
      return copy.sort((a, b) => b.remaining_sessions - a.remaining_sessions)
    case 'registered_desc':
    default:
      return copy.sort((a, b) => b.registered_at.localeCompare(a.registered_at))
  }
}

export default function MembersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const session = getAdminSession()
  const isTrainer = isTrainerStaff(session)
  const [allMembers, setAllMembers] = useState<
    Awaited<ReturnType<typeof fetchMembers>>
  >([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof fetchMembers>> | null
  >(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [renewalFilter, setRenewalFilter] = useState<RenewalFilter>('all')
  const [sortOption, setSortOption] = useState<MemberSortOption>('registered_desc')
  const [loading, setLoading] = useState(true)
  const [deductingId, setDeductingId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [updatingTrainerId, setUpdatingTrainerId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dbWarning, setDbWarning] = useState<string | null>(null)

  const loadTrainers = useCallback(async () => {
    try {
      const data = await fetchTrainers()
      setTrainers(data)
      setDbWarning(null)
    } catch (err) {
      setTrainers([])
      setDbWarning(formatSupabaseError(err))
    }
  }, [])

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMembers()
      setAllMembers(data)
      await loadTrainers()
    } catch (err) {
      setAllMembers([])
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [loadTrainers])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  const VALID_FILTERS: RenewalFilter[] = [
    'all',
    'active',
    'unregistered',
    'renewal',
    'urgent',
    'expiring',
    'expiring14',
    'renewal-priority',
    'terminated',
  ]

  useEffect(() => {
    const raw = searchParams.get('filter')
    if (!raw) return
    if (VALID_FILTERS.includes(raw as RenewalFilter)) {
      setRenewalFilter(raw as RenewalFilter)
    }
  }, [searchParams])

  const onboardingParam = searchParams.get('onboarding')

  const scopedMembers = useMemo(() => {
    if (!isTrainer || !session?.trainerId) return allMembers
    return allMembers.filter((member) => member.trainer_id === session.trainerId)
  }, [allMembers, isTrainer, session?.trainerId])

  const isOnboardingRegister =
    onboardingParam === 'register' ||
    (!isTrainer && !loading && scopedMembers.length === 0)
  const showOnboardingGuide =
    !isTrainer && (onboardingParam === 'register' || onboardingParam === 'portal')

  useEffect(() => {
    const term = searchInput.trim()
    if (!term) {
      setActiveSearch('')
      setSearchResults(null)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [serverMatches, clientMatches] = await Promise.all([
            fetchMembers(term),
            Promise.resolve(filterBySearch(scopedMembers, term)),
          ])
          const trainerFilter = (member: (typeof serverMatches)[number]) =>
            !isTrainer ||
            !session?.trainerId ||
            member.trainer_id === session.trainerId

          const merged = new Map<string, (typeof serverMatches)[number]>()
          for (const member of [...serverMatches, ...clientMatches]) {
            if (!trainerFilter(member)) continue
            merged.set(member.id, member)
          }
          setSearchResults([...merged.values()])
          setActiveSearch(term)
        } catch (err) {
          setSearchResults(filterBySearch(scopedMembers, term))
          setActiveSearch(term)
          setError(formatSupabaseError(err))
        } finally {
          setSearchLoading(false)
        }
      })()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchInput, scopedMembers, isTrainer, session?.trainerId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const renewalStats = useMemo(
    () => computeRenewalStats(scopedMembers),
    [scopedMembers],
  )

  const filterCounts = useMemo(
    () => ({
      all: scopedMembers.length,
      active: scopedMembers.filter((m) => m.status === 'active').length,
      unregistered: scopedMembers.filter(isUnregisteredMember).length,
      renewal: scopedMembers.filter(isRenewalTarget).length,
      expiring: scopedMembers.filter((m) =>
        isExpiringSoon(m.expires_at, m.status),
      ).length,
      expiring14: scopedMembers.filter(isExpiringWithin14Days).length,
      'renewal-priority': scopedMembers.filter(isRenewalPriorityMember).length,
      terminated: renewalStats.terminatedCount,
    }),
    [scopedMembers, renewalStats.terminatedCount],
  )

  const displayMembers = useMemo(() => {
    const term = activeSearch.trim()
    const base = term
      ? searchResults ?? filterBySearch(scopedMembers, term)
      : applyRenewalFilter(scopedMembers, renewalFilter)
    return sortMembers(base, sortOption)
  }, [scopedMembers, activeSearch, renewalFilter, searchResults, sortOption])

  const suggestionMembers = useMemo(() => {
    const term = searchInput.trim()
    if (!term) return []
    return searchResults ?? filterBySearch(scopedMembers, term)
  }, [searchInput, searchResults, scopedMembers])

  const listEmptyMessage =
    activeSearch.trim().length > 0
      ? `"${activeSearch.trim()}" 검색 결과가 없습니다.`
      : '등록된 회원이 없습니다.'

  function handleSelectMember(member: (typeof allMembers)[number]) {
    navigate(`/admin/member/${member.id}`)
  }

  function handleClearSearch() {
    setActiveSearch('')
    setSearchResults(null)
  }

  async function handleTrainerChange(
    memberId: string,
    trainerId: string | null,
  ) {
    const member = allMembers.find((m) => m.id === memberId)
    if (!member || (member.trainer_id ?? null) === trainerId) return
    const trainer = trainers.find((t) => t.id === trainerId)
    setUpdatingTrainerId(memberId)
    setError(null)
    try {
      await updateMemberTrainer(memberId, trainerId, trainer?.name ?? null)
      setToast(
        trainerId
          ? `${member.name} 님 → ${trainer?.name} 트레이너`
          : `${member.name} 님 트레이너 미지정`,
      )
      await loadMembers()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '트레이너 변경에 실패했습니다.',
      )
    } finally {
      setUpdatingTrainerId(null)
    }
  }

  async function handleStatusChange(memberId: string, status: MemberStatus) {
    const member = allMembers.find((m) => m.id === memberId)
    if (!member || member.status === status) return
    setUpdatingStatusId(memberId)
    setError(null)
    try {
      await updateMemberStatus(memberId, status)
      setToast(`${member.name} 님 상태 → ${MEMBER_STATUS_LABELS[status]}`)
      await loadMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  async function handleDeduct(memberId: string) {
    const member = allMembers.find((m) => m.id === memberId)
    if (!member) return
    if (
      !window.confirm(
        `${member.name} 님의 PT 1회를 차감할까요?\n(잔여: ${member.remaining_sessions}회)`,
      )
    )
      return
    setDeductingId(memberId)
    setError(null)
    try {
      await deductSession(memberId)
      setToast(`${member.name} 님 PT 1회 차감 완료`)
      await loadMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : '차감에 실패했습니다.')
    } finally {
      setDeductingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="회원 관리"
          description={
            isTrainer
              ? '담당 회원 조회 및 상세 관리'
              : '등록·검색·PT 차감 및 상세 관리'
          }
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          {!isTrainer && (
            <MemberImportPanel
              trainers={trainers}
              onImported={() => void loadMembers()}
            />
          )}
          <button
            type="button"
            onClick={() => exportMembersExcel(sortMembers(scopedMembers, sortOption))}
            disabled={loading || scopedMembers.length === 0}
            className={btnOutline}
          >
            엑셀 다운로드
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm font-medium text-charcoal">
          {toast}
        </div>
      )}
      {dbWarning && (
        <div className="rounded-xl border border-gold/60 bg-white px-4 py-3 text-sm text-charcoal">
          <p className="font-semibold text-gold-dark">DB 설정 필요</p>
          <p className="mt-1">{dbWarning}</p>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {showOnboardingGuide && <CenterOnboardingPanel compact />}

      {isOnboardingRegister && !isTrainer && (
        <div className="rounded-xl border border-gold/40 bg-cream/50 px-4 py-3 text-sm text-charcoal">
          <p className="font-semibold">지금 할 일: 첫 회원 1명 등록</p>
          <p className="mt-1 text-muted">
            이름과 휴대폰만 입력하세요. 등록 즉시 회원에게 가입 안내 알림톡이 발송됩니다.
          </p>
        </div>
      )}

      {!isTrainer && (
        <MemberForm
          trainers={trainers}
          members={allMembers}
          onCreated={() => void loadMembers()}
          onboardingMode={isOnboardingRegister}
          centerSlug={session?.centerSlug}
          centerName={session?.centerName}
        />
      )}

      <section className="space-y-3">
        <MemberFilterBar
          active={renewalFilter}
          onChange={setRenewalFilter}
          counts={filterCounts}
        />
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSortOption(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sortOption === option.value
                  ? 'border-charcoal bg-charcoal text-cream'
                  : 'border-gold/30 bg-white text-charcoal hover:border-gold/60'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <MemberSearchCombobox
          value={searchInput}
          suggestions={suggestionMembers}
          loading={searchLoading}
          onChange={setSearchInput}
          onSelect={handleSelectMember}
          onClear={handleClearSearch}
        />
        {activeSearch && (
          <p className="text-xs text-muted">
            입력하면 목록에서 바로 고를 수 있습니다. 검색 중에는 전체 회원에서
            조회하며, 지우기를 누르면 상단 필터가 다시 적용됩니다.
          </p>
        )}
      </section>

      <MemberList
        members={displayMembers}
        trainers={trainers}
        loading={loading || searchLoading}
        emptyMessage={listEmptyMessage}
        onOpenDetail={(id) => navigate(`/admin/member/${id}`)}
        onDeduct={(id) => void handleDeduct(id)}
        onStatusChange={(id, s) => void handleStatusChange(id, s)}
        onTrainerChange={(id, tid) => void handleTrainerChange(id, tid)}
        deductingId={deductingId}
        updatingStatusId={updatingStatusId}
        updatingTrainerId={updatingTrainerId}
        readOnly={isTrainer}
      />
    </div>
  )
}
