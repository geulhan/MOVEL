import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  applyTimestampToImageFile,
  blobToCenterPhotoFile,
  capturePhotoWithTimestamp,
  formatCenterPhotoTimestamp,
  startCenterPhotoCamera,
  stopCenterPhotoStream,
} from '../lib/centerPhotoCamera'
import { btnGold, btnOutline } from '../styles/theme'

type Props = {
  onClose: () => void
  onCapture: (file: File) => void
}

type Step = 'camera' | 'preview'

export function CenterPhotoCameraCapture({ onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const nativeInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [step, setStep] = useState<Step>('camera')
  const [loadingCamera, setLoadingCamera] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)

  const stopCamera = useCallback(() => {
    stopCenterPhotoStream(streamRef.current)
    streamRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    setLoadingCamera(true)
    setError(null)
    stopCamera()

    try {
      streamRef.current = await startCenterPhotoCamera(video)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '카메라를 시작할 수 없습니다.',
      )
    } finally {
      setLoadingCamera(false)
    }
  }, [stopCamera])

  useEffect(() => {
    previewUrlRef.current = previewUrl
  }, [previewUrl])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    let cancelled = false
    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) void startCamera()
      })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
      document.body.style.overflow = ''
      stopCamera()
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [startCamera, stopCamera])

  useEffect(() => {
    if (step !== 'camera') return
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [step])

  async function handleCapture() {
    const video = videoRef.current
    if (!video || capturing) return

    setCapturing(true)
    setError(null)
    try {
      const capturedAt = new Date()
      const blob = await capturePhotoWithTimestamp(video, capturedAt)
      const file = blobToCenterPhotoFile(blob, capturedAt)
      const url = URL.createObjectURL(blob)

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      stopCamera()

      setPreviewUrl(url)
      setCapturedFile(file)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : '사진 촬영에 실패했습니다.')
    } finally {
      setCapturing(false)
    }
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setCapturedFile(null)
    setStep('camera')
    void startCamera()
  }

  function handleConfirm() {
    if (!capturedFile) return
    onCapture(capturedFile)
  }

  async function handleNativeCameraFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || capturing) return

    setCapturing(true)
    setError(null)
    try {
      const capturedAt = new Date()
      const blob = await applyTimestampToImageFile(file, capturedAt)
      const stampedFile = blobToCenterPhotoFile(blob, capturedAt)
      const url = URL.createObjectURL(blob)

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      stopCamera()

      setPreviewUrl(url)
      setCapturedFile(stampedFile)
      setStep('preview')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '사진 처리에 실패했습니다.',
      )
    } finally {
      setCapturing(false)
    }
  }

  const timestampLabel = formatCenterPhotoTimestamp(now)

  const content = (
    <div
      className="fixed inset-0 z-[200] flex h-[100dvh] flex-col bg-charcoal text-cream"
      role="dialog"
      aria-modal="true"
      aria-label="센터 사진 촬영"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-gold/20 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-cream/80 hover:text-cream"
        >
          닫기
        </button>
        <h3 className="text-sm font-bold">센터 사진 촬영</h3>
        <span className="w-10" aria-hidden />
      </header>

      <p className="shrink-0 px-4 pt-3 text-center text-xs leading-relaxed text-cream/75">
        센터에서 직접 촬영한 사진만 인증됩니다. 화면에 표시된 날짜·시간이 사진에
        함께 저장됩니다.
      </p>

      {step === 'camera' ? (
        <>
          <div className="relative min-h-0 flex-1 px-4 pt-3">
            <div className="relative h-full overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

              {loadingCamera && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-cream/80">
                  카메라 준비 중…
                </div>
              )}

              {!loadingCamera && !error && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-4 py-3">
                  <p className="text-center font-mono text-sm font-bold tracking-wide text-white">
                    {timestampLabel}
                  </p>
                </div>
              )}
            </div>
          </div>

          <footer
            className="shrink-0 px-4 pt-4"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void handleCapture()}
                disabled={loadingCamera || capturing || Boolean(error)}
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-4 border-gold bg-cream text-sm font-bold text-charcoal shadow-lg transition enabled:active:scale-95 disabled:opacity-40"
                aria-label="사진 촬영"
              >
                {capturing ? '…' : '촬영'}
              </button>
            </div>
          </footer>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-3">
          {previewUrl && (
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
              <img
                src={previewUrl}
                alt="촬영한 센터 사진 미리보기"
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <div
            className="grid shrink-0 grid-cols-2 gap-3 pt-4"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={handleRetake}
              className={`${btnOutline} border-cream/30 bg-transparent py-3 text-cream hover:bg-cream/10`}
            >
              다시 촬영
            </button>
            <button type="button" onClick={handleConfirm} className={`${btnGold} py-3`}>
              인증하기
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="shrink-0 space-y-3 px-4 pb-3 text-center"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-sm text-red-200">
            <span className="inline-block rounded-lg border border-red-300/40 bg-red-950/40 px-3 py-2">
              {error}
            </span>
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void startCamera()}
              className={`${btnOutline} border-cream/30 bg-transparent px-4 py-2 text-sm text-cream hover:bg-cream/10`}
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => nativeInputRef.current?.click()}
              disabled={capturing}
              className={`${btnGold} px-4 py-2 text-sm`}
            >
              기본 카메라 앱으로 촬영
            </button>
          </div>
        </div>
      )}

      <input
        ref={nativeInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        onChange={(event) => void handleNativeCameraFile(event)}
      />
    </div>
  )

  return createPortal(content, document.body)
}
