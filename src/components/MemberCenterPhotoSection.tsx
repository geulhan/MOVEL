import { useCallback, useEffect, useState } from 'react'
import {
  fetchTodayCenterPhotoSubmission,
  submitCenterPhoto,
  type CenterPhotoSubmission,
} from '../api/centerPhoto'
import { fetchRewardEarnRules } from '../api/rewards'
import { DEFAULT_REWARD_RULES } from '../constants/rewards'
import { formatSupabaseError } from '../lib/errors'
import { btnGold, cardClass } from '../styles/theme'
import { CenterPhotoCameraCapture } from './CenterPhotoCameraCapture'

type Props = {
  memberId: string
  refreshToken?: number
  onSuccess?: () => void
}

export function MemberCenterPhotoSection({
  memberId,
  refreshToken,
  onSuccess,
}: Props) {
  const [todaySubmission, setTodaySubmission] =
    useState<CenterPhotoSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [earnRules, setEarnRules] = useState(DEFAULT_REWARD_RULES)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [submission, rules] = await Promise.all([
        fetchTodayCenterPhotoSubmission(memberId),
        fetchRewardEarnRules(),
      ])
      setTodaySubmission(submission)
      setEarnRules(rules)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  async function handleCapturedPhoto(file: File) {
    setShowCamera(false)
    setUploading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const result = await submitCenterPhoto(memberId, file)
      setTodaySubmission(result.submission)
      const parts = [
        earnRules.center_photo.score > 0
          ? `SCORE +${earnRules.center_photo.score.toLocaleString()}점`
          : null,
        result.mileAwarded > 0
          ? `MILE +${result.mileAwarded.toLocaleString()}M`
          : null,
      ].filter(Boolean)
      setSuccessMsg(
        parts.length > 0
          ? `센터 사진 인증 완료 · ${parts.join(' · ')}`
          : '센터 사진 인증 완료',
      )
      onSuccess?.()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setUploading(false)
    }
  }

  const approvedToday = todaySubmission?.status === 'approved'

  return (
    <>
      <section className={`${cardClass} p-5 sm:p-6`}>
        <h4 className="text-sm font-bold text-charcoal">센터 사진 인증</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          센터에서 카메라로 사진을 촬영하면{' '}
          <strong className="text-charcoal">
            SCORE +{earnRules.center_photo.score.toLocaleString()}점 · MILE +
            {earnRules.center_photo.mile.toLocaleString()}M
          </strong>
          이 적립됩니다. 촬영 시 날짜·시간이 사진에 표시됩니다. (하루 1회)
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-muted">불러오는 중…</p>
        ) : approvedToday ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            오늘 센터 사진 인증 완료
            {todaySubmission.mile_awarded > 0 && (
              <span className="ml-1 font-bold tabular-nums">
                · MILE +{todaySubmission.mile_awarded.toLocaleString()}M
              </span>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              disabled={uploading}
              className={`flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-bold text-charcoal transition ${
                uploading
                  ? 'pointer-events-none bg-gold/40 opacity-70'
                  : `${btnGold} hover:bg-gold-dark`
              }`}
            >
              {uploading ? '인증 처리 중…' : '카메라로 촬영하기'}
            </button>
          </div>
        )}

        {successMsg && (
          <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {successMsg}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {showCamera && (
        <CenterPhotoCameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={(file) => void handleCapturedPhoto(file)}
        />
      )}
    </>
  )
}
