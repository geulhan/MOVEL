import { todayDateString } from '../../api/members'
import {
  extractVerificationCodesFromText,
  normalizeVerificationCode,
} from './verificationCodeMatch'
import { buildOcrImageVariants } from './stepImagePreprocess'

/**
 * 건강앱 캡처 OCR 파이프라인
 * - 다크/라이트 모드: normal · inverted · binarize 3회 시도
 * - 엔진: Tesseract.js (kor+eng)
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
  healthRegionOnly?: boolean
  excludeCodeDigits?: string
  /** 간편 인증(코드 자동 합성) — 걸음수만 있으면 성공 처리 */
  codeTrusted?: boolean
}

type ParseOptions = {
  excludeCodeDigits?: string
  codeTrusted?: boolean
}

function stepCountQualityBonus(n: number): number {
  if (n >= 25_000) return -2500
  if (n >= 20_000) return -1800
  if (isRoundStepGoal(n)) return -400
  if (n % 1000 === 0) return -300
  if (n >= MIN_DAILY_STEPS && n < 20_000) return 300
  return 0
}

const MIN_DAILY_STEPS = 7000

function scoreParseResult(result: StepOcrParseResult): number {
  let score = 0
  if (result.extracted_step_count != null) {
    score += 5000 + stepCountQualityBonus(result.extracted_step_count)
  }
  if (result.extracted_date) score += 500
  if (result.extracted_code) score += 200
  if (result.rawText.match(/\d{3,}/)) score += 50
  score += result.confidence * 10
  return score
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
    text,
    parseOptions?.excludeCodeDigits,
  )
  const extracted_date = extractDate(text)
  const extracted_time = extractTime(normalized)

  const hasUsefulData = Boolean(
    extracted_step_count || extracted_code || extracted_date,
  )
  const hasDigits = /\d{3,}/.test(normalized)

  const success =
    parseOptions?.codeTrusted === true
      ? hasUsefulData || hasDigits
      : hasUsefulData || (confidence > 0 && hasDigits)

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

function isYearLike(n: number): boolean {
  return n >= 2020 && n <= 2035
}

const COMMON_STEP_GOALS = new Set([
  3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000,
])

type StepCountCandidate = {
  value: number
  weight: number
}

function isLikelyWeeklyAggregate(text: string, raw: string, value: number): boolean {
  const idx = text.indexOf(raw)
  if (idx < 0) return false
  const context = text.slice(Math.max(0, idx - 24), idx + raw.length + 24)
  return /(?:주간|이번\s*주|weekly|week|7\s*일|일주)/i.test(context) && value >= 15_000
}

function pushStepCandidate(
  candidates: StepCountCandidate[],
  raw: string,
  weight: number,
  excludeCodeDigits?: string,
  sourceText?: string,
): void {
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
  if (n < 100 || n > 100_000 || isYearLike(n)) return
  if (excludeCodeDigits && String(n) === excludeCodeDigits) return
  if (sourceText && isLikelyWeeklyAggregate(sourceText, raw, n)) return
  candidates.push({ value: n, weight })
}

function isRoundStepGoal(n: number): boolean {
  return COMMON_STEP_GOALS.has(n)
}

function candidateScore(value: number, weight: number): number {
  return weight + stepCountQualityBonus(value)
}

function pickBestStepCount(candidates: StepCountCandidate[]): number | null {
  if (candidates.length === 0) return null

  const weightByValue = new Map<number, number>()
  for (const { value, weight } of candidates) {
    weightByValue.set(value, (weightByValue.get(value) ?? 0) + weight)
  }

  const ranked = [...weightByValue.entries()]
    .map(([value, weight]) => ({ value, weight, score: candidateScore(value, weight) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (
        a.value >= MIN_DAILY_STEPS &&
        b.value >= MIN_DAILY_STEPS &&
        a.value <= 20_000 &&
        b.value <= 20_000
      ) {
        return a.value - b.value
      }
      return a.value - b.value
    })

  return ranked[0]?.value ?? null
}

function extractStepCount(
  text: string,
  excludeCodeDigits?: string,
): number | null {
  const normalized = text.replace(/\s+/g, ' ')
  const candidates: StepCountCandidate[] = []

  const labeledPatterns: Array<{ pattern: RegExp; weight: number }> = [
    {
      pattern: /(?:걸음|보|steps?|step\s*count|walking)\s*[:：]?\s*([\d,.\s]+)/gi,
      weight: 140,
    },
    { pattern: /([\d,]+)\s*(?:걸음|보|steps?)/gi, weight: 135 },
    { pattern: /오늘\s*([\d,]+)/gi, weight: 130 },
    { pattern: /(?:총|합계|total)\s*[:：]?\s*([\d,]+)/gi, weight: 40 },
  ]

  for (const { pattern, weight } of labeledPatterns) {
    let m: RegExpExecArray | null
    pattern.lastIndex = 0
    while ((m = pattern.exec(normalized)) !== null) {
      pushStepCandidate(
        candidates,
        m[1],
        weight,
        excludeCodeDigits,
        normalized,
      )
    }
  }

  const progressPattern = /([\d,]+)\s*\/\s*([\d,]+)/gi
  let progressMatch: RegExpExecArray | null
  while ((progressMatch = progressPattern.exec(normalized)) !== null) {
    pushStepCandidate(
      candidates,
      progressMatch[1],
      125,
      excludeCodeDigits,
      normalized,
    )
    const goal = parseInt(progressMatch[2].replace(/[^\d]/g, ''), 10)
    if (
      goal >= 500 &&
      goal <= 100_000 &&
      !isYearLike(goal) &&
      (!excludeCodeDigits || String(goal) !== excludeCodeDigits)
    ) {
      candidates.push({ value: goal, weight: 8 })
    }
  }

  const plainNumbers =
    normalized.match(/\b(\d{1,3}(?:[,\s.'·]\d{3})+|\d{4,6})\b/g) ?? []
  for (const chunk of plainNumbers) {
    const n = parseInt(chunk.replace(/[^\d]/g, ''), 10)
    if (n >= 20_000) continue
    const weight = isRoundStepGoal(n) ? 20 : 45
    pushStepCandidate(candidates, chunk, weight, excludeCodeDigits, normalized)
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!/^\d[\d,.\s]{2,}$/.test(trimmed)) continue
    const n = parseInt(trimmed.replace(/[^\d]/g, ''), 10)
    if (n >= 20_000) continue
    const weight = isRoundStepGoal(n) ? 30 : 70
    pushStepCandidate(candidates, String(n), weight, excludeCodeDigits, text)
  }

  return pickBestStepCount(candidates)
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

function mergeParseResults(
  results: StepOcrParseResult[],
  parseOptions?: ParseOptions,
): StepOcrParseResult {
  const combinedText = results.map((r) => r.rawText).join('\n')
  const maxConfidence = Math.max(...results.map((r) => r.confidence), 0)

  let best = parseStepCaptureText(combinedText, maxConfidence, parseOptions)
  for (const result of results) {
    if (scoreParseResult(result) > scoreParseResult(best)) {
      best = result
    }
  }

  const merged = parseStepCaptureText(combinedText, maxConfidence, parseOptions)
  if (scoreParseResult(merged) >= scoreParseResult(best)) {
    best = merged
  }

  return {
    ...best,
    rawText: combinedText,
    confidence: maxConfidence,
  }
}

/** 이미지 파일 OCR 실행 (다크/라이트 모드 대응 다중 시도) */
export async function analyzeStepCaptureImage(
  file: File,
  onProgress?: (pct: number) => void,
  options?: StepOcrOptions,
): Promise<StepOcrParseResult> {
  try {
    const cropRatio = options?.healthRegionOnly ? 0.7 : 1
    const variants = await buildOcrImageVariants(file, cropRatio)
    const { createWorker, PSM } = await import('tesseract.js')
    const worker = await createWorker('kor+eng', undefined, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          const pass = Number(m.progress ?? 0)
          onProgress(Math.min(99, Math.round(pass * 100)))
        }
      },
    })

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    })

    const parseOptions: ParseOptions = {
      excludeCodeDigits: options?.excludeCodeDigits,
      codeTrusted: options?.codeTrusted,
    }

    const passResults: StepOcrParseResult[] = []

    for (let i = 0; i < variants.length; i++) {
      const { data } = await worker.recognize(variants[i])
      const confidence = (data.confidence ?? 0) / 100
      passResults.push(
        parseStepCaptureText(data.text, confidence, parseOptions),
      )
      onProgress?.(Math.round(((i + 1) / variants.length) * 100))
    }

    await worker.terminate()

    const merged = mergeParseResults(passResults, parseOptions)
    onProgress?.(100)
    return merged
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
