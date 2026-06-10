import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { fetchMemberById } from '../api/memberDetail'
import { formatDate, formatPhone } from '../api/members'
import {
  checkIn,
  clearMemberSession,
  fetchJournals,
  fetchRecentAttendance,
  fetchTodayAttendance,
  findMemberByPhone,
  getMemberSession,
  saveMemberSession,
  type AttendanceLog,
  type ExerciseJournal,
} from '../api/memberPortal'
import { PhoneInput, phoneBodyToFull, validatePhoneBody } from '../components/PhoneInput'
import { MemberLayout } from '../components/layouts/MemberLayout'
import { btnGold, btnPrimary, cardClass, inputClass } from '../styles/theme'
import type { Member } from '../types/database'
import { MEMBER_STATUS_LABELS } from '../types/database'
import { MemberRewardsSection } from '../components/MemberRewardsSection'
import { MemberScheduleSection } from '../components/MemberScheduleSection'
import { SessionCount } from '../components/SessionCount'

type Tab = 'home' | 'schedule' | 'attendance' | 'journal' | 'rewards'

export default function MemberPortalPage() {
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [phoneBody, setPhoneBody] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('home')

  const [todayAttendance, setTodayAttendance] = useState<AttendanceLog | null>(
    null,
  )
  const [recentAttendance, setRecentAttendance] = useState<AttendanceLog[]>(
    [],
  )
  const [journals, setJournals] = useState<ExerciseJournal[]>([])
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const loadMemberData = useCallback(async (memberId: string) => {
    const m = await fetchMemberById(memberId)
    setMember(m)

    try {
      const today = await fetchTodayAttendance(memberId)
      setTodayAttendance(today)
    } catch {
      setTodayAttendance(null)
    }

    try {
      const recent = await fetchRecentAttendance(memberId)
      setRecentAttendance(recent)
    } catch {
      setRecentAttendance([])
    }

    try {
      const j = await fetchJournals(memberId)
      setJournals(j)
    } catch {
      setJournals([])
    }
  }, [])

  useEffect(() => {
    const id = getMemberSession()
    if (!id) {
      setLoading(false)
      return
    }
    void loadMemberData(id)
      .catch((err) => {
        clearMemberSession()
        setMember(null)
        setLoginError(
          err instanceof Error
            ? err.message
            : '회원 정보를 불러오지 못했습니다. 다시 로그인해 주세요.',
        )
      })
      .finally(() => setLoading(false))
  }, [loadMemberData])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError(null)
    const phoneError = validatePhoneBody(phoneBody)
    if (phoneError) {
      setLoginError(phoneError)
      return
    }
    setLoginLoading(true)
    try {
      const found = await findMemberByPhone(phoneBodyToFull(phoneBody))
      if (!found) {
        setLoginError('등록된 회원을 찾을 수 없습니다.')
        return
      }
      saveMemberSession(found.id)
      await loadMemberData(found.id)
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : '조회에 실패했습니다.',
      )
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    clearMemberSession()
    setMember(null)
    setPhoneBody('')
    setTab('home')
  }

  async function handleCheckIn() {
    if (!member) return
    if (
      !window.confirm(
        `출석 처리할까요?\nPT 1회가 차감됩니다. (잔여 ${member.remaining_sessions}회)`,
      )
    ) {
      return
    }
    setCheckInLoading(true)
    setPortalError(null)
    try {
      await checkIn(member.id)
      await loadMemberData(member.id)
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : '출석 실패')
    } finally {
      setCheckInLoading(false)
    }
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className={`${cardClass} p-8 text-center`}>
          <p className="text-sm text-muted">불러오는 중…</p>
        </div>
      </MemberLayout>
    )
  }

  if (!member) {
    return (
      <MemberLayout>
        <section className={`${cardClass} p-6`}>
          <h2 className="text-lg font-semibold text-charcoal">회원 페이지</h2>
          <p className="mt-1 text-xs text-muted">
            주소: <strong>/member</strong>
          </p>
          <h3 className="mt-4 text-base font-semibold text-charcoal">로그인</h3>
          <p className="mt-1 text-sm text-muted">
            등록된 전화번호로 본인 정보를 확인합니다.
          </p>
          <form onSubmit={(e) => void handleLogin(e)} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">전화번호</span>
              <PhoneInput
                value={phoneBody}
                onChange={setPhoneBody}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={loginLoading}
              className={`w-full ${btnPrimary}`}
            >
              {loginLoading ? '확인 중…' : '내 정보 보기'}
            </button>
            {loginError && (
              <p className="text-sm text-red-700">{loginError}</p>
            )}
          </form>
        </section>
      </MemberLayout>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: '내 정보' },
    { id: 'schedule', label: '수업 일정' },
    { id: 'attendance', label: '출석' },
    { id: 'journal', label: '운동일지' },
    { id: 'rewards', label: 'MY REWARDS' },
  ]

  return (
    <MemberLayout memberName={member.name} onLogout={handleLogout}>
      <nav className="flex gap-1 rounded-xl border border-gold/20 bg-white p-1 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-charcoal text-cream'
                : 'text-charcoal/60 hover:bg-cream'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {portalError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {portalError}
        </div>
      )}

      {tab === 'home' && (
        <section className={`${cardClass} space-y-4 p-6`}>
          <div className="text-center">
            <p className="text-2xl font-bold text-charcoal">{member.name}</p>
            <p className="text-sm text-muted">{formatPhone(member.phone)}</p>
          </div>

          <div className="rounded-xl bg-cream p-5 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-gold-dark">
              잔여 PT
            </p>
            <p className="mt-1 text-4xl font-bold text-charcoal">
              {member.remaining_sessions}
              <span className="ml-1 text-lg font-semibold text-charcoal/50">
                / {member.total_sessions}회
              </span>
            </p>
            <div className="mt-2 flex justify-center">
              <SessionCount
                total={member.total_sessions}
                remaining={member.remaining_sessions}
              />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">담당 트레이너</dt>
              <dd className="font-medium">{member.trainer_name ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted">상태</dt>
              <dd className="font-medium">
                {MEMBER_STATUS_LABELS[member.status]}
              </dd>
            </div>
            <div>
              <dt className="text-muted">등록일</dt>
              <dd className="font-medium">{formatDate(member.registered_at)}</dd>
            </div>
            <div>
              <dt className="text-muted">만료일</dt>
              <dd className="font-medium">{formatDate(member.expires_at)}</dd>
            </div>
          </dl>
        </section>
      )}

      {tab === 'schedule' && member && (
        <MemberScheduleSection memberId={member.id} />
      )}

      {tab === 'attendance' && (
        <section className="space-y-4">
          <div className={`${cardClass} p-6 text-center`}>
            <h3 className="font-semibold text-charcoal">오늘의 출석</h3>
            {todayAttendance ? (
              <>
                <p className="mt-3 font-semibold text-emerald-700">
                  ✓ 출석 완료
                </p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(todayAttendance.checked_in_at).toLocaleString(
                    'ko-KR',
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">
                  아직 오늘 출석하지 않았습니다.
                </p>
                <button
                  type="button"
                  onClick={() => void handleCheckIn()}
                  disabled={
                    checkInLoading ||
                    member.status !== 'active' ||
                    member.remaining_sessions <= 0
                  }
                  className={`mt-4 w-full ${btnGold}`}
                >
                  {checkInLoading ? '처리 중…' : '출석하기 (PT 1회 차감)'}
                </button>
                {member.status !== 'active' && (
                  <p className="mt-2 text-xs text-red-600">
                    활성 회원만 출석할 수 있습니다.
                  </p>
                )}
                {member.status === 'active' &&
                  member.remaining_sessions <= 0 && (
                    <p className="mt-2 text-xs text-red-600">
                      잔여 PT가 없어 출석할 수 없습니다.
                    </p>
                  )}
              </>
            )}
          </div>

          <div className={`${cardClass} p-4`}>
            <h4 className="text-sm font-semibold text-charcoal">최근 출석</h4>
            {recentAttendance.length === 0 ? (
              <p className="mt-2 text-sm text-muted">출석 기록이 없습니다.</p>
            ) : (
              <ul className="mt-2 divide-y divide-gold/15 text-sm">
                {recentAttendance.map((a) => (
                  <li key={a.id} className="py-2 text-muted">
                    {new Date(a.checked_in_at).toLocaleString('ko-KR')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {tab === 'rewards' && member && (
        <MemberRewardsSection memberId={member.id} />
      )}

      {tab === 'journal' && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-gold/20 px-4 py-4">
            <h3 className="font-semibold text-charcoal">운동일지</h3>
            <p className="mt-1 text-xs text-muted">
              트레이너가 작성한 운동 기록입니다.
            </p>
          </div>
          {journals.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              아직 등록된 운동일지가 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-gold/15">
              {journals.map((j) => (
                <li key={j.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-gold/20 px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums">
                      {formatDate(j.trained_at)}
                    </span>
                    {j.title && (
                      <span className="text-sm font-semibold text-charcoal">
                        {j.title}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal/85">
                    {j.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </MemberLayout>
  )
}
