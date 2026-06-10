/**
 * 건강앱 캡처 OCR 파이프라인
 * - 엔진: Tesseract.js (클라이언트) → 추후 Google Vision / AWS Textract 교체 가능
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

const CODE_PATTERN = /MOVEL[-\s]?(\d{4})/i

/** OCR 원문에서 걸음수·날짜·시간·코드 추출 */
export function parseStepCaptureText(
  rawText: string,
  confidence: number,
): StepOcrParseResult {
  const text = rawText.replace(/\r/g, '\n')
  const normalized = text.replace(/\s+/g, ' ')

  const codeMatch = normalized.match(CODE_PATTERN)
  const extracted_code = codeMatch
    ? `MOVEL-${codeMatch[1]}`
    : null

  const extracted_step_count = extractStepCount(normalized)
  const extracted_date = extractDate(normalized)
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
  ]

  const candidates: number[] = []

  for (const pattern of labeled) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      const n = parseInt(m[1].replace(/[^\d]/g, ''), 10)
      if (n >= 1000 && n <= 100000) candidates.push(n)
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

  const short = text.match(/(\d{1,2})[.\-/](\d{1,2})(?:[.\-/]|일)?/)
  if (short) {
    const month = short[1].padStart(2, '0')
    const day = short[2].padStart(2, '0')
    return `${y}-${month}-${day}`
  }

  if (/오늘|today/i.test(text)) {
    return today.toISOString().slice(0, 10)
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

/** 이미지 파일 OCR 실행 */
export async function analyzeStepCaptureImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<StepOcrParseResult> {
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('kor+eng', undefined, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round((m.progress ?? 0) * 100))
        }
      },
    })

    const { data } = await worker.recognize(file)
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
