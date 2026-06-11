function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 불러오지 못했습니다.'))
    }
    img.src = url
  })
}

function canvasToJpegFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지 합성에 실패했습니다.'))
          return
        }
        resolve(new File([blob], name, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  })
}

function drawCodeBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  code: string,
  dateLabel: string,
): void {
  ctx.fillStyle = '#1c1c1c'
  ctx.fillRect(x, y, width, height)

  ctx.fillStyle = '#c8b882'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(height * 0.14)}px Pretendard, "Apple SD Gothic Neo", sans-serif`
  ctx.fillText('MOVEL', x + width / 2, y + height * 0.28)

  ctx.font = `bold ${Math.round(height * 0.34)}px Pretendard, "Apple SD Gothic Neo", sans-serif`
  ctx.fillText(code, x + width / 2, y + height * 0.56)

  ctx.fillStyle = 'rgba(245, 240, 232, 0.8)'
  ctx.font = `${Math.round(height * 0.12)}px Pretendard, "Apple SD Gothic Neo", sans-serif`
  ctx.fillText(dateLabel, x + width / 2, y + height * 0.8)
}

/** 건강앱 캡처 아래에 오늘 인증코드 배너를 붙입니다 (아이폰용). */
export async function appendVerificationCodeBanner(
  healthFile: File,
  code: string,
  dateLabel: string,
): Promise<File> {
  const health = await loadImage(healthFile)
  const width = Math.min(1200, Math.max(health.width, 720))
  const healthHeight = Math.round(health.height * (width / health.width))
  const bannerHeight = Math.round(width * 0.28)
  const gap = 6

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = healthHeight + gap + bannerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지 합성에 실패했습니다.')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(health, 0, 0, width, healthHeight)
  drawCodeBanner(ctx, 0, healthHeight + gap, width, bannerHeight, code, dateLabel)

  return canvasToJpegFile(
    canvas,
    `mobel-ios-verification-${Date.now()}.jpg`,
  )
}

/** 건강앱·코드 스크린샷 2장을 위아래로 합칩니다. */
export async function mergeVerificationScreenshots(
  healthFile: File,
  codeFile: File,
): Promise<File> {
  const [health, code] = await Promise.all([
    loadImage(healthFile),
    loadImage(codeFile),
  ])

  const width = Math.min(1200, Math.max(health.width, code.width))
  const healthHeight = Math.round(health.height * (width / health.width))
  const codeHeight = Math.round(code.height * (width / code.width))
  const gap = 6

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = healthHeight + gap + codeHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지 합성에 실패했습니다.')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(health, 0, 0, width, healthHeight)
  ctx.drawImage(code, 0, healthHeight + gap, width, codeHeight)

  return canvasToJpegFile(canvas, `mobel-merged-verification-${Date.now()}.jpg`)
}
