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

/** OCR 원문에서 걸음수·날짜·시간·코드 추출 */
export function parseStepCaptureText(
  rawText: string,
  confidence: number,
): StepOcrParseResult {
  const text = rawText.replace(/\r/g, '\n')
  const normalized = text.replace(/\s+/g, ' ')

  const codeCandidates = extractVerificationCodesFromText(text)
  const extracted_code =
    codeCandidates[0] != null ? normalizeVerificationCode(codeCandidates[0]) : null

  const extracted_step_count = extractStepCount(normalized)
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

function extractStepCount(text: string): number | null {
  const labeled = [
    /(?:걸음|보|steps?)\s*[:：]?\s*([\d,.\s]+)/gi,
    /([\d,]+)\s*(?:걸음|보|steps?)/gi,
    /오늘\s*([\d,]+)/gi,
    /([\d,]+)\s*\/\s*[\d,]+/gi,
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

  const plainNumbers = text.match(/\b([\d]{1,3}(?:[,\s]\d{3})+)\b/g) ?? []
  for (const chunk of plainNumbers) {
    const n = parseInt(chunk.replace(/[^\d]/g, ''), 10)
    if (n >= 1000 && n <= 100000) candidates.push(n)
  }

  if (candidates.length === 0) return null
  return Math.max(...candidates)
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

async function prepareImageForOcr(file: File): Promise<File | Blob> {
  if (typeof createImageBitmap !== 'function') return file

  try {
    const bitmap = await createImageBitmap(file)
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest < 1800 ? Math.min(2.5, 1800 / longest) : 1
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
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
): Promise<StepOcrParseResult> {
  try {
    const prepared = await prepareImageForOcr(file)
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('kor+eng', undefined, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round((m.progress ?? 0) * 100))
        }
      },
    })

    const { data } = await worker.recognize(prepared)
    await worker.terminate()

    const confidence = (data.confidence ?? 0) / 100

    return parseStepCaptureText(data.text, confidence)
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
