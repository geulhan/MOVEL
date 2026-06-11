import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { fetchMemberById } from '../api/memberDetail'
import { formatDate, formatPhone, isExpired } from '../api/members'
import {
  fetchMemberSchedules,
  getTodayScheduledPts,
  hasScheduledPtToday,
  type PtSchedule,
} from '../api/schedule'
import { loginMember } from '../api/memberAuth'
import {
  checkIn,
  clearMemberSession,
  fetchJournals,
  fetchRecentAttendance,
  fetchTodayAttendance,
  getMemberSession,
  type AttendanceLog,
  type ExerciseJournal,
} from '../api/memberPortal'
import { SiteUrlCopy } from '../components/SiteUrlCopy'
import { MemberMyPageSection } from '../components/MemberMyPageSection'
import { getMemberPortalUrl } from '../lib/siteUrl'
import { MemberLayout } from '../components/layouts/MemberLayout'
import { btnGold, btnPrimary, cardClass, inputClass } from '../styles/theme'
import type { Member } from '../types/database'
import { MEMBER_STATUS_LABELS } from '../types/database'
import { MemberRewardsSection } from '../components/MemberRewardsSection'
import { PullToRefresh } from '../components/PullToRefresh'
import { MemberScheduleSection } from '../components/MemberScheduleSection'
import { SessionCount } from '../components/SessionCount'

type Tab = 'home' | 'schedule' | 'attendance' | 'journal' | 'rewards' | 'mypage'

export default function MemberPortalPage() {
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
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
  const [schedules, setSchedules] = useState<PtSchedule[]>([])
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

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

    try {
      const scheduleList = await fetchMemberSchedules(memberId)
      setSchedules(scheduleList)
    } catch {
      setSchedules([])
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
    setLoginLoading(true)
    try {
      const { memberId } = await loginMember(loginPhone, loginPassword)
      const loggedInMember = await fetchMemberById(memberId)
      setMember(loggedInMember)
      setLoginPassword('')
      void loadMemberData(memberId)
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : '로그인에 실패했습니다.',
      )
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    clearMemberSession()
    setMember(null)
    setLoginPhone('')
    setLoginPassword('')
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

  const handlePortalRefresh = useCallback(async () => {
    const memberId = member?.id ?? getMemberSession()
    if (!memberId) return
    setPortalError(null)
    await loadMemberData(memberId)
    setRefreshToken((token) => token + 1)
  }, [member, loadMemberData])

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
          <SiteUrlCopy
            className="mt-3"
            url={getMemberPortalUrl()}
            label="회원 페이지 주소 (전체 주소를 북마크·카톡 공유)"
          />
          <h3 className="mt-4 text-base font-semibold text-charcoal">로그인</h3>
          <p className="mt-1 text-sm text-muted">
            아이디는 휴대전화번호(숫자만), 최초 비밀번호는 번호 뒤 4자리입니다.
          </p>
          <form onSubmit={(e) => void handleLogin(e)} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                아이디 (휴대전화번호)
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={loginPhone}
                onChange={(e) =>
                  setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                }
                placeholder="01012345678"
                className={inputClass}
                autoComplete="username"
                disabled={loginLoading}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">비밀번호</span>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="휴대폰 뒤 4자리 (예: 5678)"
                className={inputClass}
                autoComplete="current-password"
                maxLength={32}
                disabled={loginLoading}
              />
            </label>
            <button
              type="submit"
              disabled={
                loginLoading || loginPhone.length !== 11 || !loginPassword
              }
              className={`w-full ${btnPrimary}`}
            >
              {loginLoading ? '로그인 중…' : '로그인'}
            </button>
            {loginError && (
              <p className="text-sm text-red-700">{loginError}</p>
            )}
          </form>
        </section>
      </MemberLayout>
    )
  }

  const todaySchedules = getTodayScheduledPts(schedules)
  const hasTodayPt = hasScheduledPtToday(schedules)
  const memberExpired =
    member.expires_at != null && isExpired(member.expires_at)
  const canCheckIn =
    !todayAttendance &&
    member.status === 'active' &&
    member.remaining_sessions > 0 &&
    !memberExpired &&
    hasTodayPt

  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: '내 정보' },
    { id: 'schedule', label: '수업 일정' },
    { id: 'attendance', label: '출석' },
    { id: 'journal', label: '운동일지' },
    { id: 'rewards', label: 'MY REWARDS' },
    { id: 'mypage', label: '마이페이지' },
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

      <PullToRefresh onRefresh={handlePortalRefresh}>
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
            {todaySchedules.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-charcoal/80">
                {todaySchedules.map((s) => (
                  <li key={s.id} className="tabular-nums">
                    오늘 PT ·{' '}
                    {new Date(s.scheduled_at).toLocaleString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-amber-800">
                오늘 예약된 PT가 없습니다. 센터에서 스케줄 등록 후 출석할 수
                있습니다.
              </p>
            )}
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
                  disabled={checkInLoading || !canCheckIn}
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
                {member.status === 'active' &&
                  member.remaining_sessions > 0 &&
                  memberExpired && (
                    <p className="mt-2 text-xs text-red-600">
                      회원권 만료일이 지나 출석할 수 없습니다.
                    </p>
                  )}
                {member.status === 'active' &&
                  member.remaining_sessions > 0 &&
                  !memberExpired &&
                  !hasTodayPt && (
                    <p className="mt-2 text-xs text-red-600">
                      오늘 PT 예약이 있어야 출석할 수 있습니다.
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
          <MemberRewardsSection
            memberId={member.id}
            refreshToken={refreshToken}
          />
        )}

        {tab === 'mypage' && member && (
          <MemberMyPageSection phone={member.phone} />
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
      </PullToRefresh>
    </MemberLayout>
  )
}
