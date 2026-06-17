import { useCallback, useEffect, useState } from 'react'
import {
  computeStepTierAwards,
  fetchRewardBalance,
  fetchRewardTransactions,
  type RewardBalance,
  type RewardTransaction,
  type StepRewardResult,
} from '../api/rewards'
import {
  fetchMemberStepVerifications,
  fetchTodayVerificationStatus,
  getTodayVerificationCode,
  submitStepVerification,
  type StepVerification,
  type SubmitStepVerificationOptions,
} from '../api/stepVerification'
import {
  MIN_STEPS_FOR_VERIFICATION,
  REWARD_EVENT_LABELS,
  type RewardEventType,
} from '../constants/rewards'
import { formatDate, todayDateString } from '../api/members'
import { formatSupabaseError } from '../lib/errors'
import {
  closeVerificationCodePiP,
  getActiveVerificationCodePipMode,
  getVerificationCodePipMode,
  initVerificationCodePipLifecycle,
  isVerificationCodePipActive,
  openVerificationCodePiP,
  subscribeVerificationCodeOverlayClose,
  verificationCodePipButtonLabel,
  verificationCodePipHelpText,
} from '../lib/verificationCodePip'
import { useClientDevice } from '../hooks/useClientDevice'
import { VerificationCodeFullscreen } from './VerificationCodeFullscreen'
import { IosStepVerificationUpload } from './IosStepVerificationUpload'
import { MemberCenterPhotoSection } from './MemberCenterPhotoSection'
import { MemberRewardGuideSection } from './MemberRewardGuideSection'
import { btnGold, btnOutline, cardClass } from '../styles/theme'

type HistoryTab = 'earn' | 'spend'

type Props = {
  memberId: string
  refreshToken?: number
}

/** 모바일 갤러리(사진 보관함) 열기용 — capture 속성 없음 */
const GALLERY_IMAGE_ACCEPT =
  'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic'

function formatTxnDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function eventLabel(txn: { event_type: string; note?: string | null }): string {
  if (txn.event_type === 'custom_reward' && txn.note) {
    return txn.note.split(' (')[0] ?? txn.note
  }
  return REWARD_EVENT_LABELS[txn.event_type as RewardEventType] ?? txn.event_type
}

function verificationStatusLabel(v: StepVerification): string {
  if (v.status === 'approved') return '승인'
  if (v.status === 'rejected') return '반려'
  return '검수 중'
}

export function MemberRewardsSection({ memberId, refreshToken }: Props) {
  const [balance, setBalance] = useState<RewardBalance | null>(null)
  const [transactions, setTransactions] = useState<RewardTransaction[]>([])
  const [todayCode, setTodayCode] = useState('')
  const [todayVerification, setTodayVerification] =
    useState<StepVerification | null>(null)
  const [recentVerifications, setRecentVerifications] = useState<
    StepVerification[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [lastRewardResult, setLastRewardResult] =
    useState<StepRewardResult | null>(null)
  const [historyTab, setHistoryTab] = useState<HistoryTab>('earn')
  const [uploading, setUploading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<number | null>(null)
  const [showCodeFullscreen, setShowCodeFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pipActive, setPipActive] = useState(false)
  const [pipLoading, setPipLoading] = useState(false)
  const pipMode = getVerificationCodePipMode()
  const device = useClientDevice()
  const showMobileEasyUpload =
    !device.ready || device.isMobile

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bal, txns, code, todayV, verifications] = await Promise.all([
        fetchRewardBalance(memberId),
        fetchRewardTransactions(memberId, { limit: 80 }),
        getTodayVerificationCode(memberId),
        fetchTodayVerificationStatus(memberId),
        fetchMemberStepVerifications(memberId, 5),
      ])
      setBalance(bal)
      setTransactions(txns)
      setTodayCode(code)
      setTodayVerification(todayV)
      setRecentVerifications(verifications)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  useEffect(() => {
    initVerificationCodePipLifecycle()

    function syncPipState() {
      setPipActive(isVerificationCodePipActive())
    }

    syncPipState()
    document.addEventListener('visibilitychange', syncPipState)
    document.addEventListener('leavepictureinpicture', syncPipState)
    const unsubscribeOverlay = subscribeVerificationCodeOverlayClose(syncPipState)
    return () => {
      document.removeEventListener('visibilitychange', syncPipState)
      document.removeEventListener('leavepictureinpicture', syncPipState)
      unsubscribeOverlay()
    }
  }, [])

  const alreadyApprovedToday = todayVerification?.status === 'approved'
  const todayStepAwards =
    alreadyApprovedToday && todayVerification?.extracted_step_count != null
      ? computeStepTierAwards(todayVerification.extracted_step_count)
      : []

  async function handleTogglePip() {
    if (pipActive) {
      await closeVerificationCodePiP()
      setPipActive(false)
      return
    }
    if (!todayCode) return

    setPipLoading(true)
    setError(null)
    try {
      const ok = await openVerificationCodePiP(
        todayCode,
        formatDate(todayDateString()),
      )
      setPipActive(ok)
      if (!ok) {
        setError(
          '코드 창을 열지 못했습니다. 「인증코드 전체화면」을 이용하거나 분할 화면으로 캡처해 주세요.',
        )
      }
    } catch (err) {
      setPipActive(false)
      setError(
        err instanceof Error ? err.message : 'PiP 창을 열지 못했습니다.',
      )
    } finally {
      setPipLoading(false)
    }
  }

  async function handleCopyCode() {
    if (!todayCode) return
    try {
      await navigator.clipboard.writeText(todayCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('코드 복사에 실패했습니다. 전체화면에서 직접 확인해 주세요.')
    }
  }

  async function handleImageSelect(
    file: File | null,
    input?: HTMLInputElement | null,
    submitOptions?: SubmitStepVerificationOptions,
  ) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('이미지는 10MB 이하만 가능합니다.')
      return
    }

    setUploading(true)
    setOcrProgress(0)
    setError(null)
    setSuccessMsg(null)
    setLastRewardResult(null)

    try {
      const result = await submitStepVerification(
        memberId,
        file,
        (pct) => setOcrProgress(pct),
        submitOptions,
      )
      setSuccessMsg(result.message)
      setLastRewardResult(result.rewardResult ?? null)
      if (!result.approved) {
        setError(result.message)
      }
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setUploading(false)
      setOcrProgress(null)
      if (input) input.value = ''
    }
  }

  const filteredTxns = transactions.filter((t) =>
    historyTab === 'earn' ? t.amount > 0 : t.amount < 0,
  )

  return (
    <div className="space-y-4">
      {showCodeFullscreen && todayCode && (
        <VerificationCodeFullscreen
          code={todayCode}
          onClose={() => setShowCodeFullscreen(false)}
        />
      )}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-gold/20 bg-charcoal px-4 py-3 sm:px-5">
          <h3 className="text-base font-bold text-cream">모벨 리워드</h3>
          {loading ? (
            <span className="text-xs text-cream/60">불러오는 중…</span>
          ) : balance ? (
            <div className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gold">
                마일리지
              </p>
              <p className="text-lg font-bold tabular-nums leading-tight text-cream">
                {balance.move_mile.toLocaleString()}
                <span className="ml-0.5 text-sm font-semibold text-cream/70">M</span>
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <h4 className="text-sm font-bold text-charcoal">오늘 인증하기</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          건강앱에는 MOVEL 코드가 없습니다.{' '}
          {pipMode !== 'none' ? (
            <>
              <strong className="text-charcoal">「코드 PiP/떠있는 창」</strong>
              이나{' '}
            </>
          ) : null}
          <strong className="text-charcoal">모바일 간편 인증</strong>으로
          건강앱 캡처 + 코드를 한 번에 제출할 수 있습니다.
        </p>
        {pipMode !== 'none' && (
          <p className="mt-1 text-[11px] text-amber-800">
            {verificationCodePipHelpText(pipMode)}
          </p>
        )}

        <details className="mt-3 rounded-lg border border-gold/25 bg-cream/40 px-3 py-2 text-xs text-charcoal/80">
          <summary className="cursor-pointer font-bold text-charcoal">
            캡처 방법 더보기
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-1 leading-relaxed">
            <li>
              <strong>아이폰:</strong> 「모바일 간편 인증」→ 건강앱 스크린샷 1장
            </li>
            <li>
              <strong>갤럭시:</strong> 「코드 PiP 창」또는 분할 화면 캡처
            </li>
            <li>
              <strong>공통:</strong> 인증 기준{' '}
              <strong>{MIN_STEPS_FOR_VERIFICATION.toLocaleString()}보 이상</strong> · 오늘 날짜
            </li>
          </ul>
        </details>

        <div className="mt-4 rounded-xl border-2 border-dashed border-gold/50 bg-charcoal px-4 py-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gold/80">
            오늘의 인증코드
          </p>
          <p className="mt-2 text-3xl font-bold tracking-widest text-gold">
            {todayCode || '…'}
          </p>
          <p className="mt-2 text-[11px] text-cream/50">
            캡처 화면에 이 코드가 보여야 합니다
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            {pipMode !== 'none' && (
              <button
                type="button"
                onClick={() => void handleTogglePip()}
                disabled={!todayCode || pipLoading}
                className={
                  pipActive ? `sm:flex-1 ${btnGold}` : `sm:flex-1 ${btnOutline}`
                }
              >
                {pipLoading
                  ? '창 여는 중…'
                  : verificationCodePipButtonLabel(
                      pipActive ? getActiveVerificationCodePipMode() : pipMode,
                      pipActive,
                    )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCodeFullscreen(true)}
              className={`sm:flex-1 ${btnOutline}`}
            >
              인증코드 전체화면
            </button>
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className={`sm:flex-1 ${btnOutline}`}
            >
              {copied ? '복사됨!' : '코드 복사'}
            </button>
          </div>
        </div>

        {alreadyApprovedToday ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-bold">
              오늘 걸음수 인증 완료
              {todayVerification?.extracted_step_count != null && (
                <span className="ml-1 tabular-nums">
                  · {todayVerification.extracted_step_count.toLocaleString()}보
                </span>
              )}
            </p>
            {todayStepAwards.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {todayStepAwards.map((award) => (
                  <li key={award.eventType} className="flex justify-between gap-3">
                    <span>{award.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      SCORE +{award.score} · MILE +{award.mile.toLocaleString()}M
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {showMobileEasyUpload && (
              <IosStepVerificationUpload
                todayCode={todayCode}
                dateLabel={formatDate(todayDateString())}
                isApple={device.isIOS}
                uploading={uploading}
                ocrProgress={ocrProgress}
                onOpenFullscreen={() => setShowCodeFullscreen(true)}
                onSubmit={async (file, options) => {
                  await handleImageSelect(file, undefined, options)
                }}
              />
            )}

            {!showMobileEasyUpload && (
              <label
                className={`flex w-full cursor-pointer items-center justify-center rounded-lg px-5 py-3 text-sm font-bold text-charcoal transition ${
                  uploading
                    ? 'pointer-events-none bg-gold/40 opacity-70'
                    : `${btnGold} hover:bg-gold-dark`
                }`}
              >
                {uploading
                  ? ocrProgress !== null
                    ? `OCR 분석 중… ${ocrProgress}%`
                    : '업로드 중…'
                  : '갤러리에서 사진 선택'}
                <input
                  type="file"
                  accept={GALLERY_IMAGE_ACCEPT}
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) =>
                    void handleImageSelect(
                      e.target.files?.[0] ?? null,
                      e.target,
                    )
                  }
                />
              </label>
            )}

            {showMobileEasyUpload && (
              <details className="rounded-lg border border-gold/25 bg-white px-3 py-2 text-xs">
                <summary className="cursor-pointer font-bold text-charcoal">
                  분할 화면 한 장으로 업로드
                </summary>
                <label
                  className={`mt-2 flex w-full cursor-pointer items-center justify-center rounded-lg border border-gold/50 bg-white px-4 py-2.5 text-sm font-bold text-charcoal ${
                    uploading ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  갤러리에서 사진 선택
                  <input
                    type="file"
                    accept={GALLERY_IMAGE_ACCEPT}
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) =>
                      void handleImageSelect(
                        e.target.files?.[0] ?? null,
                        e.target,
                      )
                    }
                  />
                </label>
              </details>
            )}

            {todayVerification?.status === 'rejected' && (
              <p className="text-xs text-red-600">
                최근 반려: {todayVerification.rejection_reason}
              </p>
            )}
          </div>
        )}

        {recentVerifications.length > 0 && (
          <ul className="mt-4 divide-y divide-gold/15 rounded-lg border border-gold/20">
            {recentVerifications.slice(0, 3).map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between px-3 py-2 text-xs"
              >
                <span className="text-muted">{v.verification_date}</span>
                <span
                  className={
                    v.status === 'approved'
                      ? 'font-bold text-green-700'
                      : v.status === 'rejected'
                        ? 'font-bold text-red-600'
                        : 'text-charcoal/60'
                  }
                >
                  {verificationStatusLabel(v)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {successMsg && !error && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {lastRewardResult ? (
            <div className="space-y-2">
              <p className="font-bold">
                {lastRewardResult.stepCount.toLocaleString()}보 인증 완료
              </p>
              <ul className="space-y-1 text-xs">
                {lastRewardResult.awards.map((award) => (
                  <li key={award.eventType} className="flex justify-between gap-3">
                    <span>{award.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      SCORE +{award.score} · MILE +{award.mile.toLocaleString()}M
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-green-200 pt-2 text-xs font-bold tabular-nums">
                합계 SCORE +{lastRewardResult.totalScore} · MILE +
                {lastRewardResult.totalMile.toLocaleString()}M
              </p>
            </div>
          ) : (
            successMsg
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <MemberCenterPhotoSection
        memberId={memberId}
        refreshToken={refreshToken}
        onSuccess={() => void load()}
      />

      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex border-b border-gold/20">
          {(
            [
              { id: 'earn' as const, label: '최근 적립 내역' },
              { id: 'spend' as const, label: '최근 사용 내역' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setHistoryTab(t.id)}
              className={`flex-1 py-3 text-sm font-bold transition ${
                historyTab === t.id
                  ? 'border-b-2 border-gold bg-gold/10 text-charcoal'
                  : 'text-muted hover:bg-cream/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-gold/15">
          {filteredTxns.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted">
              내역이 없습니다.
            </li>
          ) : (
            filteredTxns.map((txn) => (
              <li
                key={txn.id}
                className="flex items-start justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-charcoal">
                    {eventLabel(txn)}
                  </p>
                  {txn.note && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {txn.note}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-charcoal/45">
                    {formatTxnDate(txn.created_at)}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    txn.amount > 0 ? 'text-gold-dark' : 'text-charcoal/60'
                  }`}
                >
                  {txn.amount > 0 ? '+' : ''}
                  {txn.amount.toLocaleString()}
                  {txn.currency === 'move_mile' ? 'M' : '점'}
                </p>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-gold/15 px-5 py-3">
          <button type="button" onClick={() => void load()} className={btnOutline}>
            새로고침
          </button>
        </div>
      </section>

      <MemberRewardGuideSection />
    </div>
  )
}
