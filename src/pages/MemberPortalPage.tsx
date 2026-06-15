import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchSignupCenters,
  type SignupCenterOption,
} from '../api/centerPublic'
import { fetchMemberById } from '../api/memberDetail'
import { formatDate, formatPhone, isExpired } from '../api/members'
import { loginMember, registerMember } from '../api/memberAuth'
import { logMemberSessionVisit } from '../api/memberLoginLogs'
import {
  checkIn,
  clearMemberSession,
  fetchRecentAttendance,
  fetchTodayAttendance,
  getMemberSession,
  type AttendanceLog,
} from '../api/memberPortal'
import {
  resolveMemberCenterSlugFromUrl,
  saveRememberedMemberCenterSlug,
} from '../lib/centerSlug'
import { ConfirmModal } from '../components/ConfirmModal'
import { CenterSearchPicker } from '../components/member/CenterSearchPicker'
import { MemberMyPageSection } from '../components/MemberMyPageSection'
import { getErrorMessage } from '../lib/errors'
import { closeVerificationCodePiP } from '../lib/verificationCodePip'
import {
  clearRememberedMemberLogin,
  loadRememberedMemberLogin,
  saveRememberedMemberLogin,
} from '../lib/rememberLogin'
import { MemberLayout } from '../components/layouts/MemberLayout'
import { btnGold, btnPrimary, cardClass, inputClass } from '../styles/theme'
import type { Member } from '../types/database'
import { MEMBER_STATUS_LABELS } from '../types/database'
import { MemberCenterPassSection } from '../components/member/MemberCenterPassSection'
import { MemberPaymentSection } from '../components/member/MemberPaymentSection'
import { MemberRewardsSection } from '../components/MemberRewardsSection'
import { PullToRefresh } from '../components/PullToRefresh'
import { MemberScheduleSection } from '../components/MemberScheduleSection'
import { MemberJournalPortalSection } from '../components/member/MemberJournalPortalSection'
import { MemberInbodySection } from '../components/member/MemberInbodySection'
import { MemberPortalNav } from '../components/member/MemberPortalNav'
import { SessionCount } from '../components/SessionCount'

type Tab =
  | 'home'
  | 'payment'
  | 'schedule'
  | 'journal'
  | 'inbody'
  | 'rewards'
  | 'mypage'
type AuthMode = 'login' | 'signup'

export default function MemberPortalPage() {
  const [searchParams] = useSearchParams()
  const [centerSlug, setCenterSlug] = useState(() =>
    resolveMemberCenterSlugFromUrl(searchParams.get('center')),
  )
  const [signupCenters, setSignupCenters] = useState<SignupCenterOption[]>([])
  const [signupCentersLoading, setSignupCentersLoading] = useState(false)
  const resolvedCenterSlug = centerSlug.trim().toLowerCase()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [signupName, setSignupName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [rememberLogin, setRememberLogin] = useState(false)
  const [tab, setTab] = useState<Tab>('home')

  const [todayAttendance, setTodayAttendance] = useState<AttendanceLog | null>(
    null,
  )
  const [recentAttendance, setRecentAttendance] = useState<AttendanceLog[]>(
    [],
  )
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [checkInConfirmOpen, setCheckInConfirmOpen] = useState(false)
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

  }, [])

  useEffect(() => {
    const saved = loadRememberedMemberLogin()
    if (saved) {
      setLoginPhone(saved.loginId)
      setLoginPassword(saved.password)
      setRememberLogin(true)
    }
  }, [])

  useEffect(() => {
    const fromUrl = resolveMemberCenterSlugFromUrl(searchParams.get('center'))
    if (fromUrl) setCenterSlug(fromUrl)
  }, [searchParams])

  useEffect(() => {
    setSignupCentersLoading(true)
    void fetchSignupCenters()
      .then(setSignupCenters)
      .catch(() => setSignupCenters([]))
      .finally(() => setSignupCentersLoading(false))
  }, [])

  useEffect(() => {
    const id = getMemberSession()
    if (!id) {
      setLoading(false)
      return
    }
    void loadMemberData(id)
      .then(() => {
        logMemberSessionVisit(id)
      })
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

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setLoginError(null)

    if (signupPassword !== signupPasswordConfirm) {
      setLoginError('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    const slug = resolvedCenterSlug
    if (!slug) {
      setLoginError('센터를 검색해서 선택해 주세요.')
      return
    }

    setLoginLoading(true)
    try {
      const { memberId } = await registerMember(
        signupName,
        signupPhone,
        signupPassword,
        centerSlug,
      )
      saveRememberedMemberCenterSlug(slug)
      const registeredMember = await fetchMemberById(memberId)
      setMember(registeredMember)
      setSignupPassword('')
      setSignupPasswordConfirm('')
      if (rememberLogin) {
        saveRememberedMemberLogin(signupPhone, signupPassword)
      }
      void loadMemberData(memberId)
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : '회원가입에 실패했습니다.',
      )
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError(null)

    const slugForLogin = resolvedCenterSlug || undefined

    setLoginLoading(true)
    try {
      const { memberId } = await loginMember(loginPhone, loginPassword, slugForLogin)
      if (slugForLogin) saveRememberedMemberCenterSlug(slugForLogin)
      const loggedInMember = await fetchMemberById(memberId)
      setMember(loggedInMember)
      if (rememberLogin) {
        saveRememberedMemberLogin(loginPhone, loginPassword)
      } else {
        clearRememberedMemberLogin()
        setLoginPassword('')
      }
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
    void closeVerificationCodePiP()
    clearMemberSession()
    setMember(null)
    const saved = rememberLogin ? loadRememberedMemberLogin() : null
    setLoginPhone(saved?.loginId ?? '')
    setLoginPassword(saved?.password ?? '')
    setTab('home')
  }

  function requestCheckIn() {
    if (!member) return
    setPortalError(null)
    setCheckInConfirmOpen(true)
  }

  async function executeCheckIn() {
    if (!member) return
    setCheckInLoading(true)
    setPortalError(null)
    try {
      await checkIn(member.id)
      setCheckInConfirmOpen(false)
      try {
        await loadMemberData(member.id)
      } catch (reloadErr) {
        console.warn('출석 후 회원 정보 갱신 실패:', reloadErr)
      }
    } catch (err) {
      setPortalError(getErrorMessage(err))
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
          <div className="flex rounded-lg border border-charcoal/10 bg-cream/50 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login')
                setLoginError(null)
              }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                authMode === 'login'
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-muted'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup')
                setLoginError(null)
              }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                authMode === 'signup'
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-muted'
              }`}
            >
              회원가입
            </button>
          </div>

          {authMode === 'login' ? (
            <>
              <p className="mt-4 text-sm text-muted">
                아이디는 휴대전화번호(숫자만)입니다. 관리자 등록 회원은 최초 비밀번호가 번호
                뒤 4자리입니다.
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
                    placeholder="비밀번호"
                    className={inputClass}
                    autoComplete="current-password"
                    maxLength={32}
                    disabled={loginLoading}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal/80">
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    disabled={loginLoading}
                    className="h-4 w-4 rounded border-gold/50 text-charcoal focus:ring-gold/40"
                  />
                  아이디·비밀번호 기억하기
                </label>
                <button
                  type="submit"
                  disabled={loginLoading || loginPhone.length !== 11 || !loginPassword}
                  className={`w-full ${btnPrimary}`}
                >
                  {loginLoading ? '로그인 중…' : '로그인'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted">
                가입할 센터를 선택한 뒤 이름·휴대전화번호·비밀번호를 입력하세요. PT 이용은 센터
                결제 후 시작됩니다.
              </p>
              <form
                onSubmit={(e) => void handleSignup(e)}
                className="mt-5 space-y-4"
              >
                <CenterSearchPicker
                  centers={signupCenters}
                  loading={signupCentersLoading}
                  selectedSlug={resolvedCenterSlug}
                  onSelect={setCenterSlug}
                  disabled={loginLoading}
                />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">이름</span>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="홍길동"
                    className={inputClass}
                    autoComplete="name"
                    disabled={loginLoading || !resolvedCenterSlug}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">휴대전화번호</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={signupPhone}
                    onChange={(e) =>
                      setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                    }
                    placeholder="01012345678"
                    className={inputClass}
                    autoComplete="tel"
                    disabled={loginLoading || !resolvedCenterSlug}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">비밀번호</span>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="4자리 이상"
                    className={inputClass}
                    autoComplete="new-password"
                    maxLength={32}
                    disabled={loginLoading || !resolvedCenterSlug}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">비밀번호 확인</span>
                  <input
                    type="password"
                    value={signupPasswordConfirm}
                    onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                    placeholder="비밀번호 다시 입력"
                    className={inputClass}
                    autoComplete="new-password"
                    maxLength={32}
                    disabled={loginLoading || !resolvedCenterSlug}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal/80">
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    disabled={loginLoading}
                    className="h-4 w-4 rounded border-gold/50 text-charcoal focus:ring-gold/40"
                  />
                  아이디·비밀번호 기억하기
                </label>
                <button
                  type="submit"
                  disabled={
                    loginLoading ||
                    !resolvedCenterSlug ||
                    !signupName.trim() ||
                    signupPhone.length !== 11 ||
                    signupPassword.length < 4 ||
                    !signupPasswordConfirm
                  }
                  className={`w-full ${btnGold}`}
                >
                  {loginLoading ? '가입 중…' : '회원가입'}
                </button>
              </form>
            </>
          )}

          {loginError && <p className="mt-4 text-sm text-red-700">{loginError}</p>}
        </section>

        <p className="text-center text-xs text-muted">
          센터 관리자이신가요?{' '}
          <Link to="/login" className="font-semibold text-teal-700 hover:underline">
            관리자 로그인
          </Link>
        </p>
      </MemberLayout>
    )
  }

  const memberExpired =
    member.expires_at != null && isExpired(member.expires_at)

  const activeNavTab = tab === 'home' ? null : tab

  return (
    <MemberLayout
      memberName={member.name}
      onLogout={handleLogout}
      onDashboard={() => setTab('home')}
    >
      <MemberPortalNav
        activeTab={activeNavTab}
        onSelect={(id) => setTab(id)}
      />

      <PullToRefresh onRefresh={handlePortalRefresh}>
        {portalError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {portalError}
          </div>
        )}

        {tab === 'home' && member && (
        <>
        <section className={`${cardClass} space-y-4 p-6`}>
          {member.total_sessions === 0 && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              <p className="font-semibold">PT 이용 전 안내</p>
              <p className="mt-1 text-sky-800/90">
                센터에서 결제·등록이 완료되면 PT 출석과 수업 일정을 이용할 수
                있습니다. REWARDS(만보 인증 등)는 지금도 이용 가능합니다.
              </p>
            </div>
          )}

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
        <MemberCenterPassSection
          memberId={member.id}
          refreshToken={refreshToken}
        />
        </>
      )}

      {tab === 'schedule' && member && (
        <MemberScheduleSection
          memberId={member.id}
          checkIn={{
            todayAttendance,
            recentAttendance,
            checkInLoading,
            onCheckIn: requestCheckIn,
            memberStatus: member.status,
            remainingSessions: member.remaining_sessions,
            memberExpired,
          }}
        />
      )}

        {tab === 'payment' && member && (
          <MemberPaymentSection memberId={member.id} />
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

        {tab === 'journal' && member && (
          <MemberJournalPortalSection memberId={member.id} />
        )}

        {tab === 'inbody' && member && (
          <MemberInbodySection memberId={member.id} createdBy="member" />
        )}
      </PullToRefresh>

      <ConfirmModal
        open={checkInConfirmOpen}
        title="출석 처리"
        message={
          member
            ? `출석 처리할까요?\nPT 1회가 차감됩니다. (잔여 ${member.remaining_sessions}회)`
            : ''
        }
        confirmLabel="출석하기"
        loading={checkInLoading}
        onConfirm={() => void executeCheckIn()}
        onCancel={() => {
          if (!checkInLoading) setCheckInConfirmOpen(false)
        }}
      />
    </MemberLayout>
  )
}
