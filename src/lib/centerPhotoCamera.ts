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

export async function startCenterPhotoCamera(
  video: HTMLVideoElement,
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('이 기기에서는 카메라를 사용할 수 없습니다.')
  }

  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false },
  ]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()
      return stream
    } catch (err) {
      lastError = err
    }
  }

  if (lastError instanceof DOMException) {
    if (lastError.name === 'NotAllowedError') {
      throw new Error('카메라 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.')
    }
    if (lastError.name === 'NotFoundError') {
      throw new Error('사용 가능한 카메라를 찾을 수 없습니다.')
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('카메라를 시작할 수 없습니다.')
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

export async function capturePhotoWithTimestamp(
  video: HTMLVideoElement,
  capturedAt = new Date(),
): Promise<Blob> {
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
