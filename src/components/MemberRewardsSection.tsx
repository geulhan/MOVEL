import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchRewardBalance,
  fetchRewardTransactions,
  type RewardBalance,
  type RewardTransaction,
} from '../api/rewards'
import {
  fetchMemberStepVerifications,
  fetchTodayVerificationStatus,
  getTodayVerificationCode,
  submitStepVerification,
  type StepVerification,
} from '../api/stepVerification'
import {
  getNextTier,
  REWARD_EVENT_LABELS,
  TIER_THRESHOLDS,
  type RewardEventType,
} from '../constants/rewards'
import { formatSupabaseError } from '../lib/errors'
import { VerificationCodeFullscreen } from './VerificationCodeFullscreen'
import { btnGold, btnOutline, cardClass } from '../styles/theme'

type HistoryTab = 'earn' | 'spend'

type Props = {
  memberId: string
}

function tierBadgeClass(tier: string): string {
  switch (tier) {
    case 'MOVEL ELITE':
      return 'bg-charcoal text-gold border-gold/60'
    case 'GOLD':
      return 'bg-gold/25 text-charcoal border-gold'
    case 'SILVER':
      return 'bg-cream-dark text-charcoal border-gold/40'
    default:
      return 'bg-cream text-charcoal/70 border-gold/30'
  }
}

function formatTxnDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function eventLabel(eventType: string): string {
  return REWARD_EVENT_LABELS[eventType as RewardEventType] ?? eventType
}

function verificationStatusLabel(v: StepVerification): string {
  if (v.status === 'approved') return '승인'
  if (v.status === 'rejected') return '반려'
  return '검수 중'
}

export function MemberRewardsSection({ memberId }: Props) {
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
  const [historyTab, setHistoryTab] = useState<HistoryTab>('earn')
  const [uploading, setUploading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<number | null>(null)
  const [showCodeFullscreen, setShowCodeFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  }, [load])

  const alreadyApprovedToday = todayVerification?.status === 'approved'

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

  async function handleImageSelect(file: File | null) {
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

    try {
      const result = await submitStepVerification(
        memberId,
        file,
        (pct) => setOcrProgress(pct),
      )
      setSuccessMsg(result.message)
      if (!result.approved) {
        setError(result.message)
      }
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setUploading(false)
      setOcrProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filteredTxns = transactions.filter((t) =>
    historyTab === 'earn' ? t.amount > 0 : t.amount < 0,
  )

  const nextTier = balance ? getNextTier(balance.move_score) : null
  const currentTierInfo = balance
    ? TIER_THRESHOLDS.find((t) => t.tier === balance.tier)
    : null

  return (
    <div className="space-y-4">
      {showCodeFullscreen && todayCode && (
        <VerificationCodeFullscreen
          code={todayCode}
          onClose={() => setShowCodeFullscreen(false)}
        />
      )}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-gold/20 bg-charcoal px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">
            MY REWARDS
          </p>
          <h3 className="mt-1 text-lg font-bold text-cream">모벨 리워드</h3>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-muted">불러오는 중…</p>
        ) : balance ? (
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${tierBadgeClass(balance.tier)}`}
              >
                {balance.tier}
              </span>
              {nextTier && (
                <p className="text-xs text-muted">
                  {nextTier.tier}까지{' '}
                  <strong className="text-charcoal">
                    {nextTier.remaining.toLocaleString()}점
                  </strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gold/30 bg-cream/60 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-dark">
                  MOVE SCORE
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-charcoal">
                  {balance.move_score.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-dark">
                  MOVE MILE
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-charcoal">
                  {balance.move_mile.toLocaleString()}
                  <span className="ml-0.5 text-base font-semibold text-charcoal/50">
                    M
                  </span>
                </p>
              </div>
            </div>

            {currentTierInfo && balance.tier !== 'MOVEL ELITE' && (
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>{balance.tier}</span>
                  <span>
                    {currentTierInfo.min.toLocaleString()} ~{' '}
                    {currentTierInfo.max === Infinity
                      ? '∞'
                      : currentTierInfo.max.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cream-dark">
                  <div
                    className="h-full rounded-full bg-gold transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((balance.move_score - currentTierInfo.min) /
                          (currentTierInfo.max - currentTierInfo.min + 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* 오늘 인증하기 */}
      <section className={`${cardClass} p-5 sm:p-6`}>
        <h4 className="text-sm font-bold text-charcoal">오늘 인증하기</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          건강앱에는 MOVEL 코드가 없습니다. 아래「인증코드 전체화면」을 켠 뒤
          건강앱과 <strong className="text-charcoal">한 화면에 함께</strong> 보이게
          캡처해 업로드하세요.
        </p>

        <details className="mt-3 rounded-lg border border-gold/25 bg-cream/40 px-3 py-2 text-xs text-charcoal/80">
          <summary className="cursor-pointer font-bold text-charcoal">
            캡처 방법 (분할 화면)
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-1 leading-relaxed">
            <li>
              <strong>갤럭시:</strong> 최근 앱 → 모벨 회원페이지 + 삼성헬스 아이콘
              길게 눌러「분할 화면 보기」
            </li>
            <li>
              <strong>아이폰:</strong> 설정 없이는 분할 불가 → 건강앱 캡처 후
              모벨「전체화면」코드를 <strong>사진 편집</strong>으로 합치거나, 다른
              기기로 코드 화면을 띄워 함께 촬영
            </li>
            <li>
              <strong>공통:</strong> 캡처에 <strong>오늘 걸음수 + MOVEL-코드 + 오늘
              날짜</strong>가 보여야 승인됩니다
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
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => setShowCodeFullscreen(true)}
              className={btnGold}
            >
              인증코드 전체화면
            </button>
            <button type="button" onClick={() => void handleCopyCode()} className={btnOutline}>
              {copied ? '복사됨!' : '코드 복사'}
            </button>
          </div>
        </div>

        {alreadyApprovedToday ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            오늘 걸음수 인증이 완료되었습니다.
            {todayVerification?.extracted_step_count != null && (
              <span className="ml-1 font-bold tabular-nums">
                ({todayVerification.extracted_step_count.toLocaleString()}보)
              </span>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void handleImageSelect(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full ${btnGold}`}
            >
              {uploading
                ? ocrProgress !== null
                  ? `OCR 분석 중… ${ocrProgress}%`
                  : '업로드 중…'
                : '건강앱 캡처 이미지 업로드'}
            </button>
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
          {successMsg}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

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
                    {eventLabel(txn.event_type)}
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
    </div>
  )
}
