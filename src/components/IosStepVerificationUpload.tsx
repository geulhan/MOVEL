import { useState } from 'react'
import {
  appendVerificationCodeBanner,
  mergeVerificationScreenshots,
} from '../lib/image/mergeVerificationImages'
import { MIN_STEPS_FOR_VERIFICATION } from '../constants/rewards'
import { btnGold, btnOutline } from '../styles/theme'

const GALLERY_IMAGE_ACCEPT =
  'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic'

type Props = {
  todayCode: string
  dateLabel: string
  isApple?: boolean
  uploading: boolean
  ocrProgress: number | null
  disabled?: boolean
  onOpenFullscreen: () => void
  onSubmit: (
    file: File,
    options?: { codeTrusted?: boolean },
  ) => Promise<void>
}

type IosMode = 'auto' | 'manual'

export function IosStepVerificationUpload({
  todayCode,
  dateLabel,
  isApple = true,
  uploading,
  ocrProgress,
  disabled,
  onOpenFullscreen,
  onSubmit,
}: Props) {
  const [mode, setMode] = useState<IosMode>('auto')
  const [healthFile, setHealthFile] = useState<File | null>(null)
  const [codeFile, setCodeFile] = useState<File | null>(null)
  const [merging, setMerging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleAutoSubmit(file: File | null) {
    if (!file || !todayCode || disabled || uploading) return
    setLocalError(null)
    setMerging(true)
    try {
      const merged = await appendVerificationCodeBanner(
        file,
        todayCode,
        dateLabel,
      )
      await onSubmit(merged, { codeTrusted: true })
      setHealthFile(null)
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : '이미지 합성에 실패했습니다.',
      )
    } finally {
      setMerging(false)
    }
  }

  async function handleManualSubmit() {
    if (!healthFile || !codeFile || disabled || uploading) return
    setLocalError(null)
    setMerging(true)
    try {
      const merged = await mergeVerificationScreenshots(healthFile, codeFile)
      await onSubmit(merged)
      setHealthFile(null)
      setCodeFile(null)
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : '이미지 합성에 실패했습니다.',
      )
    } finally {
      setMerging(false)
    }
  }

  const busy = uploading || merging

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-gold/35 bg-cream/50 p-4">
      <div>
        <p className="text-sm font-bold text-charcoal">모바일 간편 인증</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {isApple
            ? '아이폰은 분할 화면이 안 됩니다. 건강앱 스크린샷만 올리면'
            : '분할 화면이 어려우면 건강앱 스크린샷만 올려도'}{' '}
          MOVEL이 코드를 자동으로 붙여 줍니다. 인증은{' '}
          <strong className="text-charcoal">
            {MIN_STEPS_FOR_VERIFICATION.toLocaleString()}보 이상
          </strong>
          부터 가능합니다.
        </p>
      </div>

      <ol className="list-inside list-decimal space-y-1 text-xs leading-relaxed text-charcoal/85">
        <li>
          {isApple ? 'Apple 건강' : '삼성헬스·건강앱'}에서{' '}
          <strong>오늘 걸음수</strong>가 크게 보이는 화면 캡처 (다크/라이트
          모드 모두 OK)
        </li>
        <li>아래에서 건강앱 사진 선택 → 코드 자동 합성 후 인증</li>
      </ol>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
            mode === 'auto'
              ? 'bg-charcoal text-cream'
              : 'border border-gold/40 bg-white text-charcoal'
          }`}
        >
          간편 (1장)
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
            mode === 'manual'
              ? 'bg-charcoal text-cream'
              : 'border border-gold/40 bg-white text-charcoal'
          }`}
        >
          2장 직접 합치기
        </button>
      </div>

      {mode === 'auto' ? (
        <div className="space-y-2">
          <label
            className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg px-4 py-4 text-sm font-bold transition ${
              busy || !todayCode
                ? 'pointer-events-none bg-gold/40 text-charcoal/60'
                : `${btnGold} hover:bg-gold-dark text-charcoal`
            }`}
          >
            {busy
              ? ocrProgress !== null
                ? `분석 중… ${ocrProgress}%`
                : merging
                  ? '코드 합성 중…'
                  : '업로드 중…'
              : '건강앱 스크린샷 선택 (코드 자동 합성)'}
            <input
              type="file"
              accept={GALLERY_IMAGE_ACCEPT}
              className="sr-only"
              disabled={busy || !todayCode}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setHealthFile(file)
                void handleAutoSubmit(file)
                e.target.value = ''
              }}
            />
          </label>
          {healthFile && !busy && (
            <p className="text-center text-[11px] text-muted">
              선택됨: {healthFile.name}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onOpenFullscreen}
            className={`w-full ${btnOutline}`}
          >
            ① 인증코드 전체화면 열기
          </button>
          <p className="text-[11px] text-muted">
            전체화면을 스크린샷한 뒤, 건강앱 캡처와 함께 아래에서 2장을
            선택하세요.
          </p>
          <label className={`block w-full cursor-pointer ${btnOutline} text-center`}>
            ② 건강앱 스크린샷
            <input
              type="file"
              accept={GALLERY_IMAGE_ACCEPT}
              className="sr-only"
              disabled={busy}
              onChange={(e) => setHealthFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className={`block w-full cursor-pointer ${btnOutline} text-center`}>
            ③ MOVEL 코드 스크린샷
            <input
              type="file"
              accept={GALLERY_IMAGE_ACCEPT}
              className="sr-only"
              disabled={busy}
              onChange={(e) => setCodeFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            disabled={!healthFile || !codeFile || busy || !todayCode}
            onClick={() => void handleManualSubmit()}
            className={`w-full ${btnGold}`}
          >
            {busy
              ? merging
                ? '2장 합치는 중…'
                : ocrProgress !== null
                  ? `분석 중… ${ocrProgress}%`
                  : '업로드 중…'
              : '2장 합쳐서 인증'}
          </button>
        </div>
      )}

      {localError && (
        <p className="text-xs text-red-600">{localError}</p>
      )}
    </div>
  )
}
