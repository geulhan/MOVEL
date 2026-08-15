export type CompressImageOptions = {
  /** Long edge cap in pixels. Keeps detail sharp on phone screens. */
  maxDimension?: number
  /** Initial JPEG quality (0–1). */
  quality?: number
  /** Lowest JPEG quality to try before giving up. */
  minQuality?: number
  /** Skip re-encoding when already small enough. */
  skipBelowBytes?: number
  /** Step down quality until output is under this size. */
  outputMaxBytes?: number
}

const DEFAULT_MAX_DIMENSION = 2048
const DEFAULT_QUALITY = 0.88
const DEFAULT_MIN_QUALITY = 0.82
const DEFAULT_SKIP_BELOW_BYTES = 400 * 1024
const DEFAULT_OUTPUT_MAX_BYTES = 2 * 1024 * 1024

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
      reject(new Error('이미지를 불러올 수 없습니다.'))
    }
    img.src = url
  })
}

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxDimension) {
    return { width, height }
  }
  const scale = maxDimension / longest
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function jpegFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'photo'
  return `${base}.jpg`
}

function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  quality: number,
  name: string,
  lastModified: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지를 저장할 수 없습니다.'))
          return
        }
        resolve(
          new File([blob], name, {
            type: 'image/jpeg',
            lastModified,
          }),
        )
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Resize and re-encode photos for upload. Tuned for exercise journal photos:
 * long edge capped at 2048px, high JPEG quality, only steps down if still huge.
 */
export async function compressImageForUpload(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options.quality ?? DEFAULT_QUALITY
  const minQuality = options.minQuality ?? DEFAULT_MIN_QUALITY
  const skipBelowBytes = options.skipBelowBytes ?? DEFAULT_SKIP_BELOW_BYTES
  const outputMaxBytes = options.outputMaxBytes ?? DEFAULT_OUTPUT_MAX_BYTES

  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file
  }

  let img: HTMLImageElement
  try {
    img = await loadImageFromFile(file)
  } catch {
    return file
  }

  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  if (!srcW || !srcH) return file

  const { width, height } = computeScaledDimensions(srcW, srcH, maxDimension)
  const needsResize = width !== srcW || height !== srcH

  if (
    !needsResize &&
    file.type === 'image/jpeg' &&
    file.size <= skipBelowBytes
  ) {
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  const outputName = jpegFileName(file.name)
  let currentQuality = quality
  let result: File | null = null

  while (currentQuality >= minQuality) {
    result = await canvasToJpegFile(
      canvas,
      currentQuality,
      outputName,
      file.lastModified,
    )
    if (result.size <= outputMaxBytes) break
    currentQuality -= 0.04
  }

  if (!result) return file

  if (result.size < file.size || needsResize || file.type !== 'image/jpeg') {
    return result
  }

  return file
}
