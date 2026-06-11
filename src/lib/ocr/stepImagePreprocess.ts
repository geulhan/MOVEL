export type PreprocessStyle = 'normal' | 'inverted' | 'binarize'

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function averageLuminance(data: Uint8ClampedArray): number {
  let sum = 0
  const pixels = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    sum += luminance(data[i], data[i + 1], data[i + 2])
  }
  return sum / pixels
}

function applyStyle(
  data: Uint8ClampedArray,
  style: PreprocessStyle,
): void {
  const avg = averageLuminance(data)
  const threshold = Math.max(96, Math.min(168, avg))

  for (let i = 0; i < data.length; i += 4) {
    let gray = luminance(data[i], data[i + 1], data[i + 2])

    if (style === 'inverted') {
      gray = 255 - gray
    }

    if (style === 'binarize') {
      gray = gray >= threshold ? 255 : 0
    } else {
      // 다크·라이트 모드 모두 글자 대비 강화
      gray = gray < threshold ? gray * 0.72 : Math.min(255, gray * 1.28)
    }

    data[i] = data[i + 1] = data[i + 2] = gray
  }
}

export async function buildOcrImageVariants(
  file: File,
  cropTopRatio = 1,
): Promise<Blob[]> {
  if (typeof createImageBitmap !== 'function') {
    return [file]
  }

  const bitmap = await createImageBitmap(file)
  const longest = Math.max(bitmap.width, bitmap.height)
  const scale = longest < 2200 ? Math.min(3.2, 2200 / longest) : 1
  const width = Math.round(bitmap.width * scale)
  const fullHeight = Math.round(bitmap.height * scale)
  const height = Math.round(fullHeight * cropTopRatio)

  const styles: PreprocessStyle[] = ['normal', 'inverted', 'binarize']
  const blobs: Blob[] = []

  for (const style of styles) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    ctx.drawImage(
      bitmap,
      0,
      0,
      bitmap.width,
      bitmap.height * cropTopRatio,
      0,
      0,
      width,
      height,
    )

    const imageData = ctx.getImageData(0, 0, width, height)
    applyStyle(imageData.data, style)
    ctx.putImageData(imageData, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )
    if (blob) blobs.push(blob)
  }

  bitmap.close()
  return blobs.length > 0 ? blobs : [file]
}
