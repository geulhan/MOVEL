import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  checkInFacility,
  createLockerAssignment,
  fetchActiveTowelRentals,
  fetchFacilityStats,
  fetchLockerAssignments,
  fetchTodayFacilityCheckins,
  rentTowel,
  returnTowel,
  type FacilityCheckin,
  type LockerAssignment,
  type TowelRental,
} from '../../api/facilityOps'
import { fetchMembers, formatDate, formatPhone, todayDateString } from '../../api/members'
import { getErrorMessage } from '../../lib/errors'
import { filterBySearch } from '../../utils/renewal'
import { PageHeader } from '../../components/admin/PageHeader'
import { AdminToast, useAdminToast } from '../../components/admin/AdminToast'
import { MemberSearchCombobox } from '../../components/admin/MemberSearchCombobox'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import type { Member } from '../../types/database'

export default function FacilityOpsPage() {
  const { features } = useCenterFeatures()
  const { toast, setToast, clearToast } = useAdminToast()
  const [lockers, setLockers] = useState<LockerAssignment[]>([])
  const [towels, setTowels] = useState<TowelRental[]>([])
  const [checkins, setCheckins] = useState<FacilityCheckin[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState({
    activeLockers: 0,
    expiringLockers: 0,
    rentedTowels: 0,
    todayCheckins: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [checkinQuery, setCheckinQuery] = useState('')
  const [checkinMember, setCheckinMember] = useState<Member | null>(null)

  const [lockerOpen, setLockerOpen] = useState(false)
  const [towelOpen, setTowelOpen] = useState(false)
  const [lockerNumber, setLockerNumber] = useState('')
  const [lockerQuery, setLockerQuery] = useState('')
  const [lockerMember, setLockerMember] = useState<Member | null>(null)
  const [lockerEndsAt, setLockerEndsAt] = useState('')
  const [towelQuery, setTowelQuery] = useState('')
  const [towelMember, setTowelMember] = useState<Member | null>(null)

  const checkinSuggestions = useMemo(
    () => filterBySearch(members, checkinQuery),
    [members, checkinQuery],
  )
  const lockerSuggestions = useMemo(
    () => filterBySearch(members, lockerQuery),
    [members, lockerQuery],
  )
  const towelSuggestions = useMemo(
    () => filterBySearch(members, towelQuery),
    [members, towelQuery],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const memberList = await fetchMembers()
      setMembers(memberList)

      const results = await Promise.allSettled([
        features.locker ? fetchLockerAssignments() : Promise.resolve([]),
        features.towel ? fetchActiveTowelRentals() : Promise.resolve([]),
        features.facility ? fetchTodayFacilityCheckins() : Promise.resolve([]),
        fetchFacilityStats(),
      ])

      const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
      if (failures.length > 0) {
        throw failures[0].reason
      }

      const [l, t, c, s] = results.map((r) =>
        r.status === 'fulfilled' ? r.value : null,
      ) as [LockerAssignment[], TowelRental[], FacilityCheckin[], Awaited<ReturnType<typeof fetchFacilityStats>>]

      setLockers(l)
      setTowels(t)
      setCheckins(c)
      setStats(s)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [features.facility, features.locker, features.towel])

  useEffect(() => {
    void load()
  }, [load])

  async function runAction(task: () => Promise<void>, successMessage: string) {
    setActionLoading(true)
    setError(null)
    try {
      await task()
      setToast(successMessage)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCheckin() {
    if (!checkinMember) return
    await runAction(async () => {
      await checkInFacility({ member_id: checkinMember.id })
      setCheckinMember(null)
      setCheckinQuery('')
    }, `${checkinMember.name} 님 입장 완료`)
  }

  async function handleLockerAssign() {
    if (!lockerNumber.trim() || !lockerEndsAt) {
      setError('락커 번호와 만료일을 입력해 주세요.')
      return
    }
    await runAction(async () => {
      await createLockerAssignment({
        locker_number: lockerNumber,
        member_id: lockerMember?.id ?? null,
        starts_at: todayDateString(),
        ends_at: lockerEndsAt,
      })
      setLockerNumber('')
      setLockerMember(null)
      setLockerQuery('')
      setLockerEndsAt('')
    }, '락커가 배정되었습니다.')
  }

  async function handleRentTowel() {
    const name = towelMember?.name ?? '회원'
    await runAction(async () => {
      await rentTowel({ member_id: towelMember?.id ?? null })
      setTowelMember(null)
      setTowelQuery('')
    }, `${name} 수건 대여 완료`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="시설 운영"
        description="이름·전화번호로 회원을 찾아 한 번에 입장 처리하세요."
      />

      <AdminToast message={toast} onClear={clearToast} />

      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 whitespace-pre-line">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.locker && (
          <div className={`${cardClass} card-pad`}>
            <p className="text-xs text-muted">활성 락커</p>
            <p className="text-2xl font-bold">{stats.activeLockers}</p>
          </div>
        )}
        {features.locker && (
          <div className={`${cardClass} card-pad`}>
            <p className="text-xs text-muted">7일 내 만료</p>
            <p className="text-2xl font-bold text-amber-700">{stats.expiringLockers}</p>
          </div>
        )}
        {features.towel && (
          <div className={`${cardClass} card-pad`}>
            <p className="text-xs text-muted">대여 중 수건</p>
            <p className="text-2xl font-bold">{stats.rentedTowels}</p>
          </div>
        )}
        {features.facility && (
          <div className={`${cardClass} card-pad`}>
            <p className="text-xs text-muted">오늘 입장</p>
            <p className="text-2xl font-bold">{stats.todayCheckins}</p>
          </div>
        )}
      </div>

      {features.facility && (
        <section className={`${cardClass} card-pad space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold text-charcoal">빠른 입장 체크</h2>
            <p className="mt-0.5 text-sm text-muted">
              이름이나 전화번호 뒷자리(예: 1234)로 검색 → 회원 선택 → 입장
            </p>
          </div>

          <MemberSearchCombobox
            value={checkinQuery}
            suggestions={checkinSuggestions}
            loading={loading}
            elevated
            onChange={(value) => {
              setCheckinQuery(value)
              if (checkinMember && value !== checkinMember.name) {
                setCheckinMember(null)
              }
            }}
            onSelect={(member) => {
              setCheckinMember(member)
              setCheckinQuery(member.name)
            }}
            onClear={() => setCheckinMember(null)}
          />

          {checkinMember && (
            <div className="rounded-xl border border-gold/25 bg-cream/50 px-4 py-3">
              <p className="font-semibold text-charcoal">{checkinMember.name}</p>
              <p className="text-sm text-muted">{formatPhone(checkinMember.phone)}</p>
            </div>
          )}

          <button
            type="button"
            className={`${btnPrimary} w-full py-3.5 text-base font-semibold`}
            disabled={!checkinMember || actionLoading}
            onClick={() => void handleCheckin()}
          >
            {checkinMember ? `${checkinMember.name} 님 입장 체크` : '회원을 선택해 주세요'}
          </button>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">오늘 입장 ({checkins.length})</p>
            {checkins.length === 0 ? (
              <p className="text-sm text-muted">아직 입장 기록이 없습니다.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {checkins.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-full border border-gold/25 bg-white px-3 py-1 text-xs text-charcoal"
                  >
                    {c.member_name}{' '}
                    <span className="text-muted">
                      {new Date(c.checked_in_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {features.locker && (
        <section className={`${cardClass} card-pad space-y-3`}>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setLockerOpen((open) => !open)}
          >
            <h2 className="font-semibold text-charcoal">락커 관리</h2>
            <span className="text-sm text-muted">{lockerOpen ? '접기' : '펼치기'}</span>
          </button>
          {lockerOpen && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className={inputClass}
                  placeholder="락커 번호"
                  value={lockerNumber}
                  onChange={(e) => setLockerNumber(e.target.value)}
                />
                <input
                  type="date"
                  className={inputClass}
                  value={lockerEndsAt}
                  onChange={(e) => setLockerEndsAt(e.target.value)}
                />
              </div>
              <MemberSearchCombobox
                value={lockerQuery}
                suggestions={lockerSuggestions}
                onChange={setLockerQuery}
                onSelect={(member) => {
                  setLockerMember(member)
                  setLockerQuery(member.name)
                }}
                onClear={() => setLockerMember(null)}
              />
              <button
                type="button"
                className={btnPrimary}
                disabled={actionLoading}
                onClick={() => void handleLockerAssign()}
              >
                락커 배정
              </button>
              {lockers.length > 0 && (
                <ul className="divide-y divide-gold/10 text-sm">
                  {lockers.slice(0, 8).map((l) => (
                    <li key={l.id} className="flex justify-between py-2">
                      <span>
                        <strong>{l.locker_number}</strong> · {l.member_name ?? '—'}
                      </span>
                      <span className="text-muted">{formatDate(l.ends_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {features.towel && (
        <section className={`${cardClass} card-pad space-y-3`}>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setTowelOpen((open) => !open)}
          >
            <h2 className="font-semibold text-charcoal">수건 대여·반납</h2>
            <span className="text-sm text-muted">{towelOpen ? '접기' : '펼치기'}</span>
          </button>
          {towelOpen && (
            <>
              <MemberSearchCombobox
                value={towelQuery}
                suggestions={towelSuggestions}
                onChange={setTowelQuery}
                onSelect={(member) => {
                  setTowelMember(member)
                  setTowelQuery(member.name)
                }}
                onClear={() => setTowelMember(null)}
              />
              <button
                type="button"
                className={btnOutline}
                disabled={actionLoading}
                onClick={() => void handleRentTowel()}
              >
                수건 대여
              </button>
              <ul className="space-y-2 text-sm">
                {towels.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gold/15 px-3 py-2"
                  >
                    <span>
                      {t.member_name ?? '비회원'} ·{' '}
                      {new Date(t.rented_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg bg-charcoal px-3 py-1 text-xs font-semibold text-cream"
                      disabled={actionLoading}
                      onClick={() =>
                        void runAction(async () => {
                          await returnTowel(t.id)
                        }, '수건 반납 완료')
                      }
                    >
                      반납
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {loading && <p className="text-sm text-muted">불러오는 중…</p>}
    </div>
  )
}
