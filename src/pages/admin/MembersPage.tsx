import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deductSession,
  fetchMembers,
  updateMemberStatus,
  updateMemberTrainer,
} from '../../api/members'
import { fetchTrainers } from '../../api/trainers'
import { PageHeader } from '../../components/admin/PageHeader'
import { isTrainerStaff } from '../../lib/adminPermissions'
import { getAdminSession } from '../../lib/adminSession'
import { MemberFilterBar } from '../../components/MemberFilterBar'
import { MemberForm } from '../../components/MemberForm'
import { MemberSearchCombobox } from '../../components/admin/MemberSearchCombobox'
import { MemberList } from '../../components/MemberList'
import { formatSupabaseError } from '../../lib/errors'
import type { MemberStatus, Trainer } from '../../types/database'
import { MEMBER_STATUS_LABELS } from '../../types/database'
import {
  applyRenewalFilter,
  computeRenewalStats,
  filterBySearch,
  isExpiringSoon,
  isRenewalTarget,
  isUnregisteredMember,
  type RenewalFilter,
} from '../../utils/renewal'

export default function MembersPage() {
  const navigate = useNavigate()
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

  const scopedMembers = useMemo(() => {
    if (!isTrainer || !session?.trainerId) return allMembers
    return allMembers.filter((member) => member.trainer_id === session.trainerId)
  }, [allMembers, isTrainer, session?.trainerId])

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
      terminated: renewalStats.terminatedCount,
    }),
    [scopedMembers, renewalStats.terminatedCount],
  )

  const displayMembers = useMemo(() => {
    const term = activeSearch.trim()
    if (term) {
      return searchResults ?? filterBySearch(scopedMembers, term)
    }
    return applyRenewalFilter(scopedMembers, renewalFilter)
  }, [scopedMembers, activeSearch, renewalFilter, searchResults])

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
      <PageHeader
        title="회원 관리"
        description={
          isTrainer
            ? '담당 회원 조회 및 상세 관리'
            : '등록·검색·PT 차감 및 상세 관리'
        }
      />

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

      <section className="space-y-3">
        <MemberFilterBar
          active={renewalFilter}
          onChange={setRenewalFilter}
          counts={filterCounts}
        />
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

      {!isTrainer && (
        <MemberForm
          trainers={trainers}
          members={allMembers}
          onCreated={() => void loadMembers()}
        />
      )}
    </div>
  )
}
