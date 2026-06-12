import { useCallback, useEffect, useRef, useState } from 'react'
import {
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
    void startCamera()

    return () => {
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

  const timestampLabel = formatCenterPhotoTimestamp(now)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-charcoal text-cream"
      role="dialog"
      aria-modal="true"
      aria-label="센터 사진 촬영"
    >
      <header className="flex items-center justify-between border-b border-gold/20 px-4 py-3">
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

      <div className="flex flex-1 flex-col px-4 py-4">
        <p className="text-center text-xs leading-relaxed text-cream/75">
          센터에서 직접 촬영한 사진만 인증됩니다. 화면에 표시된 날짜·시간이
          사진에 함께 저장됩니다.
        </p>

        {step === 'camera' ? (
          <div className="relative mt-4 flex flex-1 flex-col">
            <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover ${
                  loadingCamera ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {loadingCamera && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-cream/70">
                  카메라 준비 중…
                </div>
              )}

              {!loadingCamera && !error && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-4 py-3">
                  <p className="text-center font-mono text-sm font-bold tracking-wide text-white sm:text-base">
                    {timestampLabel}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-center pb-2">
              <button
                type="button"
                onClick={() => void handleCapture()}
                disabled={loadingCamera || capturing || Boolean(error)}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-gold bg-cream text-xs font-bold text-charcoal transition enabled:hover:scale-105 disabled:opacity-40"
                aria-label="사진 촬영"
              >
                {capturing ? '…' : '촬영'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-1 flex-col">
            {previewUrl && (
              <div className="flex-1 overflow-hidden rounded-2xl bg-black">
                <img
                  src={previewUrl}
                  alt="촬영한 센터 사진 미리보기"
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className={`${btnOutline} border-cream/30 bg-transparent text-cream hover:bg-cream/10`}
              >
                다시 촬영
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={btnGold}
              >
                인증하기
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-300/40 bg-red-950/40 px-3 py-2 text-center text-sm text-red-200">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
