import { useCallback, useEffect, useState } from 'react'
import {
  fetchTodayCenterPhotoSubmission,
  submitCenterPhoto,
  type CenterPhotoSubmission,
} from '../api/centerPhoto'
import { formatSupabaseError } from '../lib/errors'
import { btnGold, cardClass } from '../styles/theme'

const IMAGE_ACCEPT =
  'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic'

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
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTodaySubmission(await fetchTodayCenterPhotoSubmission(memberId))
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  async function handleFileSelect(file: File | null, input?: HTMLInputElement | null) {
    if (!file) return
    setUploading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const result = await submitCenterPhoto(memberId, file)
      setTodaySubmission(result.submission)
      setSuccessMsg(`센터 사진 인증 완료 · MILE +${result.mileAwarded.toLocaleString()}M`)
      onSuccess?.()
      if (input) input.value = ''
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setUploading(false)
    }
  }

  const approvedToday = todaySubmission?.status === 'approved'

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <h4 className="text-sm font-bold text-charcoal">센터 사진 인증</h4>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        센터에서 촬영한 사진을 올리면{' '}
        <strong className="text-charcoal">MILE +500M</strong>이 적립됩니다. (하루
        1회)
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
          <label
            className={`flex w-full cursor-pointer items-center justify-center rounded-lg px-5 py-3 text-sm font-bold text-charcoal transition ${
              uploading
                ? 'pointer-events-none bg-gold/40 opacity-70'
                : `${btnGold} hover:bg-gold-dark`
            }`}
          >
            {uploading ? '업로드 중…' : '센터 사진 올리기'}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              disabled={uploading}
              onChange={(e) =>
                void handleFileSelect(e.target.files?.[0] ?? null, e.target)
              }
            />
          </label>
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
  )
}
