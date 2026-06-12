/** 센터 사진 인증용 카메라 캡처 (날짜·시간 오버레이 포함) */

export function formatCenterPhotoTimestamp(date: Date): string {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function stopCenterPhotoStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

function isAndroidDevice(): boolean {
  return /android/i.test(navigator.userAgent)
}

function configureVideoElement(video: HTMLVideoElement): void {
  video.muted = true
  video.autoplay = true
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
}

async function waitForVideoReady(
  video: HTMLVideoElement,
  timeoutMs = 10_000,
): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(
        new Error(
          '카메라 화면을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        ),
      )
    }, timeoutMs)

    const check = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup()
        resolve()
      }
    }

    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener('loadedmetadata', check)
      video.removeEventListener('playing', check)
      video.removeEventListener('resize', check)
    }

    video.addEventListener('loadedmetadata', check)
    video.addEventListener('playing', check)
    video.addEventListener('resize', check)
    check()
  })
}

async function playVideoStream(video: HTMLVideoElement): Promise<void> {
  configureVideoElement(video)
  try {
    await video.play()
  } catch {
    // 일부 Android WebView는 play() reject 후에도 스트림이 재생됩니다.
  }
  await waitForVideoReady(video)
}

async function enumerateBackCameraDeviceId(): Promise<string | undefined> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((device) => device.kind === 'videoinput')
    if (cameras.length === 0) return undefined

    const backCamera = cameras.find((device) =>
      /back|rear|environment|후면|facing back/i.test(device.label),
    )
    if (backCamera?.deviceId) return backCamera.deviceId

    // 라벨이 비어 있는 기기(권한 직후)는 마지막 카메라를 후면으로 가정하는 경우가 많습니다.
    return cameras[cameras.length - 1]?.deviceId
  } catch {
    return undefined
  }
}

async function unlockCameraDevices(): Promise<string | undefined> {
  if (!navigator.mediaDevices?.getUserMedia) return undefined

  let probe: MediaStream | null = null
  try {
    probe = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    })
    return await enumerateBackCameraDeviceId()
  } catch {
    return undefined
  } finally {
    stopCenterPhotoStream(probe)
  }
}

function buildCameraAttempts(backDeviceId?: string): MediaStreamConstraints[] {
  const attempts: MediaStreamConstraints[] = []

  if (backDeviceId) {
    attempts.push({
      video: { deviceId: { exact: backDeviceId } },
      audio: false,
    })
    attempts.push({
      video: { deviceId: { ideal: backDeviceId } },
      audio: false,
    })
  }

  attempts.push(
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    { video: { facingMode: 'environment' }, audio: false },
    { video: { facingMode: { ideal: 'user' } }, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false },
  )

  return attempts
}

function mapCameraError(err: unknown): Error {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return new Error(
        '카메라 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.',
      )
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return new Error('사용 가능한 카메라를 찾을 수 없습니다.')
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return new Error(
        '카메라를 사용할 수 없습니다. 다른 앱에서 카메라를 닫고 다시 시도해 주세요.',
      )
    }
    if (err.name === 'OverconstrainedError') {
      return new Error('이 기기 카메라 설정과 맞지 않습니다. 다시 시도해 주세요.')
    }
    if (err.name === 'SecurityError') {
      return new Error('보안 연결(HTTPS)에서만 카메라를 사용할 수 있습니다.')
    }
  }

  return err instanceof Error
    ? err
    : new Error('카메라를 시작할 수 없습니다.')
}

export async function startCenterPhotoCamera(
  video: HTMLVideoElement,
): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new Error('보안 연결(HTTPS)에서만 카메라를 사용할 수 있습니다.')
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('이 기기에서는 카메라를 사용할 수 없습니다.')
  }

  const backDeviceId =
    isAndroidDevice() ? await unlockCameraDevices() : await enumerateBackCameraDeviceId()

  const attempts = buildCameraAttempts(backDeviceId)
  let lastError: unknown

  for (const constraints of attempts) {
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints)
      video.srcObject = stream
      await playVideoStream(video)
      return stream
    } catch (err) {
      lastError = err
      stopCenterPhotoStream(stream)
      video.srcObject = null
    }
  }

  throw mapCameraError(lastError)
}

function drawTimestampOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  label: string,
): void {
  const padding = Math.max(12, Math.round(width * 0.02))
  const fontSize = Math.max(18, Math.round(width * 0.04))
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`

  const barHeight = fontSize + padding * 2
  const barY = height - barHeight

  ctx.fillStyle = 'rgba(0, 0, 0, 0.58)'
  ctx.fillRect(0, barY, width, barHeight)

  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, padding, barY + barHeight / 2)
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('사진을 불러올 수 없습니다.'))
    }
    img.src = url
  })
}

export async function applyTimestampToImageFile(
  file: File,
  capturedAt = new Date(),
): Promise<Blob> {
  const img = await loadImageFromFile(file)
  const width = img.naturalWidth
  const height = img.naturalHeight
  if (!width || !height) {
    throw new Error('사진 크기를 읽을 수 없습니다.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('사진을 생성할 수 없습니다.')
  }

  ctx.drawImage(img, 0, 0, width, height)
  drawTimestampOverlay(ctx, width, height, formatCenterPhotoTimestamp(capturedAt))

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('사진을 저장할 수 없습니다.'))
      },
      'image/jpeg',
      0.9,
    )
  })
}

export async function capturePhotoWithTimestamp(
  video: HTMLVideoElement,
  capturedAt = new Date(),
): Promise<Blob> {
  await waitForVideoReady(video)

  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) {
    throw new Error('카메라 화면을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('사진을 생성할 수 없습니다.')
  }

  ctx.drawImage(video, 0, 0, width, height)
  drawTimestampOverlay(ctx, width, height, formatCenterPhotoTimestamp(capturedAt))

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('사진을 저장할 수 없습니다.'))
      },
      'image/jpeg',
      0.9,
    )
  })
}

export function blobToCenterPhotoFile(blob: Blob, capturedAt = new Date()): File {
  const stamp = capturedAt.toISOString().replace(/[:.]/g, '-')
  return new File([blob], `center-photo-${stamp}.jpg`, {
    type: 'image/jpeg',
    lastModified: capturedAt.getTime(),
  })
}
