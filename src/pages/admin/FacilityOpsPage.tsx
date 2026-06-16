import { useCallback, useEffect, useState } from 'react'
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
import { fetchMembers, formatDate, todayDateString } from '../../api/members'
import { PageHeader } from '../../components/admin/PageHeader'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import type { Member } from '../../types/database'

export default function FacilityOpsPage() {
  const { features } = useCenterFeatures()
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
  const [lockerNumber, setLockerNumber] = useState('')
  const [lockerMemberId, setLockerMemberId] = useState('')
  const [lockerEndsAt, setLockerEndsAt] = useState('')
  const [checkinMemberId, setCheckinMemberId] = useState('')
  const [towelMemberId, setTowelMemberId] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [l, t, c, m, s] = await Promise.all([
        features.locker ? fetchLockerAssignments() : Promise.resolve([]),
        features.towel ? fetchActiveTowelRentals() : Promise.resolve([]),
        features.facility ? fetchTodayFacilityCheckins() : Promise.resolve([]),
        fetchMembers(),
        fetchFacilityStats(),
      ])
      setLockers(l)
      setTowels(t)
      setCheckins(c)
      setMembers(m)
      setStats(s)
    } finally {
      setLoading(false)
    }
  }, [features.facility, features.locker, features.towel])

  useEffect(() => {
    void load()
  }, [load])

  async function handleLockerAssign() {
    if (!lockerNumber.trim() || !lockerEndsAt) return
    await createLockerAssignment({
      locker_number: lockerNumber,
      member_id: lockerMemberId || null,
      starts_at: todayDateString(),
      ends_at: lockerEndsAt,
    })
    setLockerNumber('')
    setLockerMemberId('')
    await load()
  }

  async function handleCheckin() {
    if (!checkinMemberId) return
    await checkInFacility({ member_id: checkinMemberId })
    setCheckinMemberId('')
    await load()
  }

  async function handleRentTowel() {
    await rentTowel({ member_id: towelMemberId || null })
    setTowelMemberId('')
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="시설 운영"
        description="락커 배정, 수건 대여·반납, 시설 이용권 입장 체크를 관리합니다."
      />

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

      {loading && <p className="text-sm text-muted">불러오는 중…</p>}

      {features.facility && (
        <section className={`${cardClass} card-pad space-y-3`}>
          <h2 className="font-semibold text-charcoal">시설 입장 체크</h2>
          <div className="flex flex-wrap gap-2">
            <select
              className={inputClass}
              value={checkinMemberId}
              onChange={(e) => setCheckinMemberId(e.target.value)}
            >
              <option value="">회원 선택</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button type="button" className={btnPrimary} onClick={() => void handleCheckin()}>
              입장 체크
            </button>
          </div>
          <ul className="space-y-1 text-sm">
            {checkins.map((c) => (
              <li key={c.id}>
                {c.member_name} · {new Date(c.checked_in_at).toLocaleTimeString('ko-KR')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {features.locker && (
        <section className={`${cardClass} card-pad space-y-3`}>
          <h2 className="font-semibold text-charcoal">락커</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className={inputClass}
              placeholder="락커 번호"
              value={lockerNumber}
              onChange={(e) => setLockerNumber(e.target.value)}
            />
            <select
              className={inputClass}
              value={lockerMemberId}
              onChange={(e) => setLockerMemberId(e.target.value)}
            >
              <option value="">회원 (선택)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className={inputClass}
              value={lockerEndsAt}
              onChange={(e) => setLockerEndsAt(e.target.value)}
            />
            <button type="button" className={btnPrimary} onClick={() => void handleLockerAssign()}>
              배정
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="py-2">번호</th>
                <th className="py-2">회원</th>
                <th className="py-2">만료일</th>
                <th className="py-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {lockers.map((l) => (
                <tr key={l.id} className="border-b border-gold/10">
                  <td className="py-2">{l.locker_number}</td>
                  <td className="py-2">{l.member_name ?? '—'}</td>
                  <td className="py-2">{formatDate(l.ends_at)}</td>
                  <td className="py-2">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {features.towel && (
        <section className={`${cardClass} card-pad space-y-3`}>
          <h2 className="font-semibold text-charcoal">수건</h2>
          <div className="flex flex-wrap gap-2">
            <select
              className={inputClass}
              value={towelMemberId}
              onChange={(e) => setTowelMemberId(e.target.value)}
            >
              <option value="">회원 (선택)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button type="button" className={btnPrimary} onClick={() => void handleRentTowel()}>
              대여
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {towels.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span>
                  {t.member_name ?? '비회원'} ·{' '}
                  {new Date(t.rented_at).toLocaleTimeString('ko-KR')}
                </span>
                <button
                  type="button"
                  className={btnOutline}
                  onClick={() => void returnTowel(t.id).then(load)}
                >
                  반납
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
