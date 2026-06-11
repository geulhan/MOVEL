import { analyzeStepCaptureImage } from '../lib/ocr/stepImageOcr'
import {
  normalizeVerificationCode,
  verificationCodeMatchesCapture,
} from '../lib/ocr/verificationCodeMatch'
import { supabase } from '../lib/supabase'
import { todayDateString } from './members'
import { awardStepRewardsFromVerification, hasApprovedStepsToday } from './rewards'

export type StepVerificationStatus = 'pending' | 'approved' | 'rejected'

export type StepVerification = {
  id: string
  member_id: string
  verification_date: string
  image_url: string
  image_path: string | null
  expected_code: string
  status: StepVerificationStatus
  rejection_reason: string | null
  extracted_step_count: number | null
  extracted_date: string | null
  extracted_time: string | null
  extracted_code: string | null
  ai_confidence: number | null
  ocr_raw_text: string | null
  reviewed_at: string | null
  created_at: string
}

export type StepVerificationSubmitResult = {
  verification: StepVerification
  approved: boolean
  message: string
}

function generateCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `MOVEL-${num}`
}

const normalizeCode = normalizeVerificationCode

/** 오늘 인증코드 조회 (없으면 생성) */
export async function getTodayVerificationCode(
  memberId: string,
): Promise<string> {
  const today = todayDateString()

  const { data: existing, error: fetchError } = await supabase
    .from('step_verification_codes')
    .select('code')
    .eq('member_id', memberId)
    .eq('code_date', today)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (existing) return (existing as { code: string }).code

  const code = generateCode()
  const { error: upsertError } = await supabase
    .from('step_verification_codes')
    .upsert(
      { member_id: memberId, code_date: today, code },
      { onConflict: 'member_id,code_date' },
    )

  if (upsertError) throw upsertError
  return code
}

export async function fetchMemberStepVerifications(
  memberId: string,
  limit = 20,
): Promise<StepVerification[]> {
  const { data, error } = await supabase
    .from('step_verifications')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as StepVerification[]
}

export async function fetchTodayVerificationStatus(
  memberId: string,
): Promise<StepVerification | null> {
  const today = todayDateString()
  const { data, error } = await supabase
    .from('step_verifications')
    .select('*')
    .eq('member_id', memberId)
    .eq('verification_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as StepVerification | null) ?? null
}

type AutoReviewInput = {
  ocrSuccess: boolean
  codeMatch: boolean
  dateMatch: boolean
  stepExtracted: boolean
  alreadyApproved: boolean
  duplicatePending: boolean
}

function evaluateAutoReview(input: AutoReviewInput): {
  approved: boolean
  reason: string | null
} {
  if (input.alreadyApproved) {
    return { approved: false, reason: '같은 날짜에 이미 승인된 인증이 있습니다.' }
  }
  if (!input.ocrSuccess) {
    return { approved: false, reason: '이미지 판독(OCR)에 실패했습니다.' }
  }
  if (!input.codeMatch) {
    return { approved: false, reason: '인증코드가 일치하지 않습니다.' }
  }
  if (!input.dateMatch) {
    return { approved: false, reason: '캡처 날짜가 오늘과 일치하지 않습니다.' }
  }
  if (!input.stepExtracted) {
    return { approved: false, reason: '걸음수를 추출하지 못했습니다.' }
  }
  return { approved: true, reason: null }
}

/** 건강앱 캡처 업로드 → OCR → 자동 승인/반려 */
export async function submitStepVerification(
  memberId: string,
  file: File,
  onOcrProgress?: (pct: number) => void,
): Promise<StepVerificationSubmitResult> {
  const today = todayDateString()

  if (await hasApprovedStepsToday(memberId, today)) {
    throw new Error('오늘은 이미 걸음수 인증이 완료되었습니다.')
  }

  const expectedCode = await getTodayVerificationCode(memberId)

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const imagePath = `${memberId}/${today}_${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('step-verifications')
    .upload(imagePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from('step-verifications')
    .getPublicUrl(imagePath)

  const ocr = await analyzeStepCaptureImage(file, onOcrProgress)

  const extractedCode = ocr.extracted_code
    ? normalizeCode(ocr.extracted_code)
    : null
  const codeMatch = verificationCodeMatchesCapture(
    expectedCode,
    extractedCode,
    ocr.rawText,
  )

  const extractedDate = ocr.extracted_date ?? today
  const dateMatch = extractedDate === today || ocr.extracted_date == null

  const stepExtracted =
    ocr.extracted_step_count !== null && ocr.extracted_step_count > 0

  const { approved, reason } = evaluateAutoReview({
    ocrSuccess: ocr.success && !ocr.error,
    codeMatch,
    dateMatch,
    stepExtracted,
    alreadyApproved: false,
    duplicatePending: false,
  })

  const status: StepVerificationStatus = approved ? 'approved' : 'rejected'
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('step_verifications')
    .insert({
      member_id: memberId,
      verification_date: today,
      image_url: urlData.publicUrl,
      image_path: imagePath,
      expected_code: expectedCode,
      status,
      rejection_reason: reason,
      extracted_step_count: ocr.extracted_step_count,
      extracted_date: ocr.extracted_date,
      extracted_time: ocr.extracted_time,
      extracted_code: extractedCode,
      ai_confidence: ocr.confidence,
      ocr_raw_text: ocr.rawText.slice(0, 8000),
      reviewed_at: now,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('오늘은 이미 승인된 인증이 있습니다.')
    }
    throw error
  }

  const verification = data as StepVerification

  if (approved && ocr.extracted_step_count) {
    await awardStepRewardsFromVerification(
      memberId,
      ocr.extracted_step_count,
      today,
      verification.id,
    )
  }

  let message = approved
    ? `${ocr.extracted_step_count!.toLocaleString()}보 인증 완료 · 리워드가 적립되었습니다.`
    : reason ?? '인증이 반려되었습니다.'

  if (!approved && !codeMatch) {
    message += extractedCode
      ? ` (인식된 코드: ${extractedCode})`
      : ' (캡처에서 MOVEL 코드를 찾지 못했습니다. 코드 글자가 선명하게 보이게 다시 캡처해 주세요.)'
  }

  return {
    verification,
    approved,
    message,
  }
}

/** 관리자/트레이너: 인증 내역 조회 */
export async function fetchStepVerifications(options?: {
  memberId?: string
  limit?: number
}): Promise<StepVerification[]> {
  let query = supabase
    .from('step_verifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.memberId) {
    query = query.eq('member_id', options.memberId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as StepVerification[]
}
