import { todayDateString } from '../../api/members'
import {
  extractVerificationCodesFromText,
  normalizeVerificationCode,
} from './verificationCodeMatch'

/**
 * 건강앱 캡처 OCR 파이프라인
 * - 엔진: Tesseract.js (클라이언트)
 * - 파서: 추출 텍스트에서 걸음수·날짜·시간·인증코드 분석
 */

export type StepOcrParseResult = {
  success: boolean
  rawText: string
  confidence: number
  extracted_step_count: number | null
  extracted_date: string | null
  extracted_time: string | null
  extracted_code: string | null
  error?: string
}

export type StepOcrOptions = {
  /** 합성 이미지에서 건강앱 영역(상단)만 OCR */
  healthRegionOnly?: boolean
  /** 코드 자동 합성 시 걸음수 후보에서 제외할 4자리 */
  excludeCodeDigits?: string
}

type ParseOptions = {
  excludeCodeDigits?: string
}

/** OCR 원문에서 걸음수·날짜·시간·코드 추출 */
export function parseStepCaptureText(
  rawText: string,
  confidence: number,
  parseOptions?: ParseOptions,
): StepOcrParseResult {
  const text = rawText.replace(/\r/g, '\n')
  const normalized = text.replace(/\s+/g, ' ')

  const codeCandidates = extractVerificationCodesFromText(text)
  const extracted_code =
    codeCandidates[0] != null ? normalizeVerificationCode(codeCandidates[0]) : null

  const extracted_step_count = extractStepCount(
    normalized,
    parseOptions?.excludeCodeDigits,
  )
  const extracted_date = extractDate(text)
  const extracted_time = extractTime(normalized)

  const success =
    confidence > 0 &&
    Boolean(extracted_code || extracted_step_count || extracted_date)

  return {
    success,
    rawText: text,
    confidence: Math.round(confidence * 100) / 100,
    extracted_step_count,
    extracted_date,
    extracted_time,
    extracted_code,
  }
}

function extractStepCount(
  text: string,
  excludeCodeDigits?: string,
): number | null {
  const labeled = [
    /(?:걸음|보|steps?|step\s*count)\s*[:：]?\s*([\d,.\s]+)/gi,
    /([\d,]+)\s*(?:걸음|보|steps?)/gi,
    /오늘\s*([\d,]+)/gi,
    /([\d,]+)\s*\/\s*[\d,]+/gi,
    /(?:이동|활동)\s*[:：]?\s*([\d,]+)/gi,
  ]

  const candidates: number[] = []

  for (const pattern of labeled) {
    let m: RegExpExecArray | null
    pattern.lastIndex = 0
    while ((m = pattern.exec(text)) !== null) {
      const n = parseInt(m[1].replace(/[^\d]/g, ''), 10)
      if (n >= 100 && n <= 100000) candidates.push(n)
    }
  }

  const plainNumbers =
    text.match(/\b(\d{1,3}(?:[,\s]\d{3})+|\d{4,6})\b/g) ?? []
  for (const chunk of plainNumbers) {
    const n = parseInt(chunk.replace(/[^\d]/g, ''), 10)
    if (n >= 1000 && n <= 100000) candidates.push(n)
  }

  const filtered = candidates.filter((n) => {
    if (excludeCodeDigits && String(n) === excludeCodeDigits) return false
    return true
  })

  if (filtered.length === 0) return null
  return Math.max(...filtered)
}

function extractDate(text: string): string | null {
  const today = new Date()
  const y = today.getFullYear()

  const iso = text.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }

  const korean = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (korean) {
    return `${y}-${korean[1].padStart(2, '0')}-${korean[2].padStart(2, '0')}`
  }

  const short = text.match(/(\d{1,2})[.\-/](\d{1,2})(?:[.\-/]|일|\s|$)/)
  if (short) {
    const month = short[1].padStart(2, '0')
    const day = short[2].padStart(2, '0')
    return `${y}-${month}-${day}`
  }

  if (/오늘|today/i.test(text)) {
    return todayDateString()
  }

  return null
}

function extractTime(text: string): string | null {
  const m = text.match(/(\d{1,2})\s*[:：시]\s*(\d{2})(?:\s*분)?/)
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2]}`
  }
  return null
}

function enhanceContrastForOcr(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height)
  const pixels = imageData.data
  for (let i = 0; i < pixels.length; i += 4) {
    const gray =
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    const boosted = gray < 140 ? gray * 0.82 : Math.min(255, gray * 1.18)
    pixels[i] = pixels[i + 1] = pixels[i + 2] = boosted
  }
  ctx.putImageData(imageData, 0, 0)
}

async function prepareImageForOcr(
  file: File,
  options?: { cropTopRatio?: number },
): Promise<File | Blob> {
  if (typeof createImageBitmap !== 'function') return file

  try {
    const bitmap = await createImageBitmap(file)
    const cropRatio = options?.cropTopRatio ?? 1
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest < 2000 ? Math.min(3, 2000 / longest) : 1
    const width = Math.round(bitmap.width * scale)
    const fullHeight = Math.round(bitmap.height * scale)
    const height = Math.round(fullHeight * cropRatio)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height * cropRatio, 0, 0, width, height)
    bitmap.close()
    enhanceContrastForOcr(ctx, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.94),
    )
    return blob ?? file
  } catch {
    return file
  }
}

/** 이미지 파일 OCR 실행 */
export async function analyzeStepCaptureImage(
  file: File,
  onProgress?: (pct: number) => void,
  options?: StepOcrOptions,
): Promise<StepOcrParseResult> {
  try {
    const prepared = await prepareImageForOcr(file, {
      cropTopRatio: options?.healthRegionOnly ? 0.72 : undefined,
    })
    const { createWorker, PSM } = await import('tesseract.js')
    const worker = await createWorker('kor+eng', undefined, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round((m.progress ?? 0) * 100))
        }
      },
    })

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    })

    const { data } = await worker.recognize(prepared)
    await worker.terminate()

    const confidence = (data.confidence ?? 0) / 100

    return parseStepCaptureText(data.text, confidence, {
      excludeCodeDigits: options?.excludeCodeDigits,
    })
  } catch (err) {
    return {
      success: false,
      rawText: '',
      confidence: 0,
      extracted_step_count: null,
      extracted_date: null,
      extracted_time: null,
      extracted_code: null,
      error: err instanceof Error ? err.message : 'OCR 분석 실패',
    }
  }
}
