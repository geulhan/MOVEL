import { getCurrentCenterId } from '../lib/center'
import {
  CUSTOM_REWARD_TRIGGERS,
  DEFAULT_REWARD_RULES,
  getTierFromScore,
  MILE_EXPIRY_MONTHS,
  REDEMPTION_MAX_PERCENT,
  REWARD_EVENT_LABELS,
  MIN_STEPS_FOR_VERIFICATION,
  STEP_REWARD_TIERS,
  STREAK_DAYS,
  type CustomRewardRule,
  type CustomRewardTrigger,
  type RewardEarnRules,
  type RewardEventType,
  type RewardTier,
} from '../constants/rewards'
import { earnGrowthOnStepVerification } from './growth/growthEarnService'
import {
  PAYMENT_CATEGORIES,
  type PaymentCategory,
} from '../constants/paymentCategories'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import { todayDateString } from './members'

export type RewardCurrency = 'move_score' | 'move_mile'

export type RewardBalance = {
  member_id: string
  move_score: number
  move_mile: number
  tier: RewardTier
}

export type RewardTransaction = {
  id: string
  member_id: string
  currency: RewardCurrency
  amount: number
  balance_after: number
  event_type: string
  event_key: string | null
  reference_type: string | null
  reference_id: string | null
  note: string | null
  expires_at: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
}

type EarnRule = { score: number; mile: number }

export type { RewardEarnRules } from '../constants/rewards'

function clampNonNegInt(value: unknown, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed))
}

const CUSTOM_REWARD_TRIGGER_SET = new Set<string>(CUSTOM_REWARD_TRIGGERS)

const CUSTOM_RULE_REFERENCE_TYPES: Record<CustomRewardTrigger, string> = {
  payment_completed: 'payment_history',
  facility_checkin: 'facility_checkins',
  attendance_completed: 'attendance_logs',
  exercise_journal: 'exercise_journals',
  center_photo_approved: 'center_photo_submissions',
  member_registered: 'members',
}

function parseCustomRewardTrigger(value: unknown): CustomRewardTrigger {
  const raw = String(value ?? 'payment_completed')
  return CUSTOM_REWARD_TRIGGER_SET.has(raw)
    ? (raw as CustomRewardTrigger)
    : 'payment_completed'
}

function normalizeEarnRule(value: unknown, fallback: EarnRule): EarnRule {
  if (!value || typeof value !== 'object') return fallback
  const row = value as Record<string, unknown>
  return {
    score: clampNonNegInt(row.score, fallback.score),
    mile: clampNonNegInt(row.mile, fallback.mile),
  }
}

function normalizeCustomRule(
  value: unknown,
  index: number,
): CustomRewardRule | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const label = String(row.label ?? '').trim()
  if (!label) return null

  let payment_categories: PaymentCategory[] | null = null
  if (Array.isArray(row.payment_categories)) {
    const categories = row.payment_categories.filter(
      (item): item is PaymentCategory =>
        typeof item === 'string' &&
        (PAYMENT_CATEGORIES as readonly string[]).includes(item),
    )
    payment_categories = categories.length > 0 ? categories : null
  }

  return {
    id: String(row.id ?? `custom_${index + 1}`).trim() || `custom_${index + 1}`,
    label,
    description: String(row.description ?? '').trim(),
    trigger: parseCustomRewardTrigger(row.trigger),
    value_type: row.value_type === 'payment_percent' ? 'payment_percent' : 'fixed',
    score: clampNonNegInt(row.score, 0),
    mile: clampNonNegInt(row.mile, 0),
    payment_categories,
    is_active: row.is_active !== false,
    once_per_member: row.once_per_member === true,
  }
}

function normalizeCustomRules(value: unknown): CustomRewardRule[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const rules: CustomRewardRule[] = []

  for (const [index, item] of value.entries()) {
    const rule = normalizeCustomRule(item, index)
    if (!rule || seen.has(rule.id)) continue
    seen.add(rule.id)
    rules.push(rule)
  }

  return rules
}

export function normalizeEarnRules(
  value: Partial<RewardEarnRules> | null | undefined,
): RewardEarnRules {
  const defaults = DEFAULT_REWARD_RULES
  const raw = value as Record<string, unknown> | null | undefined
  return {
    pt_attendance: normalizeEarnRule(value?.pt_attendance, defaults.pt_attendance),
    steps_7000: normalizeEarnRule(value?.steps_7000, defaults.steps_7000),
    steps_10000: normalizeEarnRule(value?.steps_10000, defaults.steps_10000),
    steps_15000: normalizeEarnRule(value?.steps_15000, defaults.steps_15000),
    exercise_journal: normalizeEarnRule(
      value?.exercise_journal,
      defaults.exercise_journal,
    ),
    streak_7day: normalizeEarnRule(value?.streak_7day, defaults.streak_7day),
    naver_review: normalizeEarnRule(value?.naver_review, defaults.naver_review),
    center_photo: normalizeEarnRule(value?.center_photo, defaults.center_photo),
    referral_percent: clampNonNegInt(
      value?.referral_percent,
      defaults.referral_percent,
    ),
    custom_rules: normalizeCustomRules(raw?.custom_rules),
  }
}

function validateCustomRules(rules: CustomRewardRule[]): void {
  const ids = new Set<string>()

  for (const rule of rules) {
    if (!rule.label.trim()) {
      throw new Error('추가 적립 항목 이름을 입력해 주세요.')
    }
    if (ids.has(rule.id)) {
      throw new Error(`중복된 적립 항목 ID가 있습니다: ${rule.label}`)
    }
    ids.add(rule.id)

    if (rule.value_type === 'fixed' && rule.score <= 0 && rule.mile <= 0) {
      throw new Error(`"${rule.label}" SCORE 또는 MILE을 1 이상 입력해 주세요.`)
    }
    if (rule.value_type === 'payment_percent' && rule.mile <= 0 && rule.score <= 0) {
      throw new Error(`"${rule.label}" 결제 비율 또는 SCORE를 입력해 주세요.`)
    }
    if (rule.value_type === 'payment_percent' && rule.trigger !== 'payment_completed') {
      throw new Error(
        `"${rule.label}" 결제금액 비율은 결제 완료 시점에만 사용할 수 있습니다.`,
      )
    }
    if (rule.value_type === 'payment_percent' && rule.mile > 100) {
      throw new Error(`"${rule.label}" 결제 비율은 100% 이하여야 합니다.`)
    }
  }
}

export type StepRewardTierAward = {
  eventType: RewardEventType
  label: string
  minSteps: number
  score: number
  mile: number
}

export type StepRewardResult = {
  stepCount: number
  awards: StepRewardTierAward[]
  totalScore: number
  totalMile: number
}

export function computeStepTierAwards(
  stepCount: number,
  rules: RewardEarnRules = DEFAULT_REWARD_RULES,
): StepRewardTierAward[] {
  return STEP_REWARD_TIERS.filter((tier) => stepCount >= tier.min).map(
    (tier) => {
      const rule = rules[tier.key] as EarnRule
      return {
        eventType: tier.key,
        label: REWARD_EVENT_LABELS[tier.key],
        minSteps: tier.min,
        score: rule.score,
        mile: rule.mile,
      }
    },
  )
}

export function formatStepRewardSummary(result: StepRewardResult): string {
  const parts = result.awards.map(
    (award) =>
      `${award.label} SCORE +${award.score} · MILE +${award.mile.toLocaleString()}M`,
  )
  const detail = parts.length > 0 ? parts.join(' / ') : '적립 구간 없음'
  return `${result.stepCount.toLocaleString()}보 인증 · 합계 SCORE +${result.totalScore} · MILE +${result.totalMile.toLocaleString()}M (${detail})`
}

export async function fetchRewardEarnRules(): Promise<RewardEarnRules> {
  const { data, error } = await supabase
    .from('reward_settings')
    .select('setting_value')
    .is('branch_id', null)
    .eq('setting_key', 'earn_rules')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = data?.[0]
  if (!row?.setting_value) return DEFAULT_REWARD_RULES
  return normalizeEarnRules(row.setting_value as Partial<RewardEarnRules>)
}

export async function saveRewardEarnRules(rules: RewardEarnRules): Promise<void> {
  const normalized = normalizeEarnRules(rules)
  if (normalized.referral_percent > 100) {
    throw new Error('지인 소개 적립 비율은 100% 이하여야 합니다.')
  }
  validateCustomRules(normalized.custom_rules)

  const payload = {
    setting_value: normalized,
    description: 'MOVE SCORE · MILE 적립 규칙',
    updated_at: new Date().toISOString(),
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('reward_settings')
    .select('id')
    .eq('setting_key', 'earn_rules')
    .is('branch_id', null)
    .order('updated_at', { ascending: false })

  if (fetchError) throw fetchError

  const primary = existingRows?.[0]
  if (primary) {
    const { error } = await supabase
      .from('reward_settings')
      .update(payload)
      .eq('id', primary.id)
    if (error) throw error

    const duplicateIds = (existingRows ?? []).slice(1).map((row) => row.id)
    if (duplicateIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('reward_settings')
        .delete()
        .in('id', duplicateIds)
      if (deleteError) throw deleteError
    }
    return
  }

  const { error } = await supabase.from('reward_settings').insert({
    branch_id: null,
    setting_key: 'earn_rules',
    setting_value: payload.setting_value,
    description: payload.description,
  })

  if (error) throw error
}

async function sumLedgerBalance(
  memberId: string,
  currency: RewardCurrency,
): Promise<number> {
  const { data, error } = await supabase
    .from('reward_transactions')
    .select('amount')
    .eq('member_id', memberId)
    .eq('currency', currency)

  if (error) throw error
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
}

/** 거래 원장 기준으로 reward_balances 캐시를 맞춥니다. */
export async function reconcileRewardBalance(memberId: string): Promise<{
  move_score: number
  move_mile: number
}> {
  const move_score = Math.max(0, await sumLedgerBalance(memberId, 'move_score'))
  const move_mile = Math.max(0, await sumLedgerBalance(memberId, 'move_mile'))

  await updateBalance(memberId, move_score, move_mile)
  return { move_score, move_mile }
}

async function ensureBalance(memberId: string): Promise<{
  move_score: number
  move_mile: number
}> {
  const { data, error } = await supabase
    .from('reward_balances')
    .select('move_score, move_mile')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    const { error: upsertError } = await supabase
      .from('reward_balances')
      .upsert(
        {
          member_id: memberId,
          center_id: await getCurrentCenterId(memberId),
          move_score: 0,
          move_mile: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'member_id' },
      )

    if (upsertError) throw upsertError
    return reconcileRewardBalance(memberId)
  }

  const cachedScore = Number(data.move_score)
  const cachedMile = Number(data.move_mile)
  const ledgerScore = await sumLedgerBalance(memberId, 'move_score')
  const ledgerMile = await sumLedgerBalance(memberId, 'move_mile')

  if (cachedScore !== ledgerScore || cachedMile !== ledgerMile) {
    return reconcileRewardBalance(memberId)
  }

  return { move_score: cachedScore, move_mile: cachedMile }
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

async function insertTransaction(input: {
  member_id: string
  currency: RewardCurrency
  amount: number
  balance_after: number
  event_type: RewardEventType | string
  event_key?: string | null
  reference_type?: string | null
  reference_id?: string | null
  note?: string | null
  expires_at?: string | null
  metadata?: Record<string, unknown>
  created_by?: string
}): Promise<RewardTransaction> {
  const centerId = await getCurrentCenterId(input.member_id)
  const { data, error } = await supabase
    .from('reward_transactions')
    .insert({
      member_id: input.member_id,
      center_id: centerId,
      currency: input.currency,
      amount: input.amount,
      balance_after: input.balance_after,
      event_type: input.event_type,
      event_key: input.event_key ?? null,
      reference_type: input.reference_type ?? null,
      reference_id: input.reference_id ?? null,
      note: input.note ?? null,
      expires_at: input.expires_at ?? null,
      metadata: (input.metadata ?? {}) as Json,
      created_by: input.created_by ?? 'system',
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505' && input.event_key) {
      throw new Error('ALREADY_AWARDED')
    }
    throw error
  }
  return data as RewardTransaction
}

async function createMileLot(
  memberId: string,
  amount: number,
  sourceTransactionId: string,
  expiresAt: string,
): Promise<void> {
  const { error } = await supabase.from('reward_mile_lots').insert({
    member_id: memberId,
    center_id: await getCurrentCenterId(memberId),
    source_transaction_id: sourceTransactionId,
    earned_amount: amount,
    remaining_amount: amount,
    expires_at: expiresAt,
  })

  if (error) throw error
}

async function updateBalance(
  memberId: string,
  move_score: number,
  move_mile: number,
): Promise<void> {
  const { error } = await supabase
    .from('reward_balances')
    .upsert(
      {
        member_id: memberId,
        center_id: await getCurrentCenterId(memberId),
        move_score,
        move_mile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id' },
    )

  if (error) throw error
}

/** 만료된 MILE lot 정리 */
export async function processMileExpiry(memberId: string): Promise<void> {
  const now = new Date().toISOString()
  const { data: lots, error } = await supabase
    .from('reward_mile_lots')
    .select('id, remaining_amount, expires_at')
    .eq('member_id', memberId)
    .gt('remaining_amount', 0)
    .lt('expires_at', now)

  if (error) throw error
  if (!lots?.length) return

  let expiredTotal = 0
  for (const lot of lots as { id: string; remaining_amount: number }[]) {
    expiredTotal += lot.remaining_amount
    await supabase
      .from('reward_mile_lots')
      .update({ remaining_amount: 0 })
      .eq('id', lot.id)
  }

  if (expiredTotal <= 0) return

  const balance = await ensureBalance(memberId)
  const newMile = Math.max(0, balance.move_mile - expiredTotal)
  await updateBalance(memberId, balance.move_score, newMile)

  await insertTransaction({
    member_id: memberId,
    currency: 'move_mile',
    amount: -expiredTotal,
    balance_after: newMile,
    event_type: 'mile_expiry',
    event_key: `mile_expiry:${memberId}:${Date.now()}`,
    note: `${MILE_EXPIRY_MONTHS}개월 유효기간 만료`,
    created_by: 'system',
  })
}

export async function fetchRewardBalance(
  memberId: string,
): Promise<RewardBalance> {
  await processMileExpiry(memberId)
  const balance = await ensureBalance(memberId)
  return {
    member_id: memberId,
    move_score: balance.move_score,
    move_mile: balance.move_mile,
    tier: getTierFromScore(balance.move_score),
  }
}

export async function fetchRewardTransactions(
  memberId: string,
  options?: { currency?: RewardCurrency; limit?: number },
): Promise<RewardTransaction[]> {
  let query = supabase
    .from('reward_transactions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.currency) {
    query = query.eq('currency', options.currency)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as RewardTransaction[]
}

async function awardPair(
  memberId: string,
  eventType: RewardEventType,
  eventKey: string,
  score: number,
  mile: number,
  reference?: {
    reference_type?: string
    reference_id?: string
    note?: string
    created_by?: string
  },
): Promise<void> {
  if (score <= 0 && mile <= 0) return

  const balance = await ensureBalance(memberId)
  let newScore = balance.move_score
  let newMile = balance.move_mile

  if (score > 0) {
    newScore += score
    await insertTransaction({
      member_id: memberId,
      currency: 'move_score',
      amount: score,
      balance_after: newScore,
      event_type: eventType,
      event_key: `${eventKey}:score`,
      reference_type: reference?.reference_type,
      reference_id: reference?.reference_id,
      note: reference?.note,
      created_by: reference?.created_by,
    })
  }

  if (mile > 0) {
    newMile += mile
    const expiresAt = addMonths(new Date().toISOString(), MILE_EXPIRY_MONTHS)
    const mileTxn = await insertTransaction({
      member_id: memberId,
      currency: 'move_mile',
      amount: mile,
      balance_after: newMile,
      event_type: eventType,
      event_key: `${eventKey}:mile`,
      reference_type: reference?.reference_type,
      reference_id: reference?.reference_id,
      note: reference?.note,
      expires_at: expiresAt,
      created_by: reference?.created_by,
    })
    await createMileLot(memberId, mile, mileTxn.id, expiresAt)
  }

  await updateBalance(memberId, newScore, newMile)
}

async function reverseByEventKey(
  memberId: string,
  eventKeyPrefix: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('reward_transactions')
    .select('*')
    .eq('member_id', memberId)
    .like('event_key', `${eventKeyPrefix}%`)

  if (error) throw error
  const txns = (data ?? []) as RewardTransaction[]
  if (!txns.length) return

  const balance = await ensureBalance(memberId)
  let newScore = balance.move_score
  let newMile = balance.move_mile

  for (const txn of txns) {
    if (txn.amount > 0) {
      if (txn.currency === 'move_score') {
        newScore = Math.max(0, newScore - txn.amount)
      } else {
        newMile = Math.max(0, newMile - txn.amount)
        const { data: lots } = await supabase
          .from('reward_mile_lots')
          .select('id, remaining_amount')
          .eq('source_transaction_id', txn.id)
        for (const lot of (lots ?? []) as { id: string; remaining_amount: number }[]) {
          await supabase
            .from('reward_mile_lots')
            .update({ remaining_amount: 0 })
            .eq('id', lot.id)
        }
      }
    }
    await supabase.from('reward_transactions').delete().eq('id', txn.id)
  }

  await updateBalance(memberId, newScore, newMile)
}

/** PT 출석 리워드 */
export async function awardPtAttendance(
  memberId: string,
  attendanceId: string,
): Promise<void> {
  const rules = await fetchRewardEarnRules()
  const eventKey = `pt_attendance:${attendanceId}`
  try {
    await awardPair(
      memberId,
      'pt_attendance',
      eventKey,
      rules.pt_attendance.score,
      rules.pt_attendance.mile,
      { reference_type: 'attendance_logs', reference_id: attendanceId },
    )
    await upsertDailyActivity(memberId, todayDateString(), {
      has_pt_attendance: true,
    })
    await checkStreakReward(memberId)
    try {
      await awardCustomRulesOnAttendance(memberId, attendanceId)
    } catch (rewardErr) {
      console.warn('추가 적립 규칙 처리 실패:', rewardErr)
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_AWARDED') return
    throw err
  }
}

export async function reversePtAttendance(
  memberId: string,
  attendanceId: string,
): Promise<void> {
  await reverseByEventKey(memberId, `pt_attendance:${attendanceId}`)
  await upsertDailyActivity(memberId, todayDateString(), {
    has_pt_attendance: false,
  })
}

/** 센터 사진 인증 리워드 (하루 1회) */
export async function awardCenterPhoto(
  memberId: string,
  submissionId: string,
  submissionDate = todayDateString(),
): Promise<number> {
  const rules = await fetchRewardEarnRules()
  const eventKey = `center_photo:${memberId}:${submissionDate}`
  const mile = rules.center_photo.mile
  try {
    await awardPair(
      memberId,
      'center_photo',
      eventKey,
      rules.center_photo.score,
      mile,
      {
        reference_type: 'center_photo_submissions',
        reference_id: submissionId,
        note: '센터 사진 인증',
        created_by: 'system',
      },
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_AWARDED') return 0
    throw err
  }
  return mile
}

type DailyActivity = {
  step_count: number
  has_pt_attendance: boolean
  has_journal: boolean
}

async function upsertDailyActivity(
  memberId: string,
  date: string,
  patch: Partial<DailyActivity & { step_count: number; step_source: string }>,
): Promise<DailyActivity> {
  const centerId = await getCurrentCenterId(memberId)
  const { data: existing } = await supabase
    .from('member_daily_activity')
    .select('step_count, has_pt_attendance, has_journal')
    .eq('member_id', memberId)
    .eq('activity_date', date)
    .maybeSingle()

  const row = {
    member_id: memberId,
    center_id: centerId,
    activity_date: date,
    step_count: patch.step_count ?? (existing as DailyActivity | null)?.step_count ?? 0,
    has_pt_attendance:
      patch.has_pt_attendance ??
      (existing as DailyActivity | null)?.has_pt_attendance ??
      false,
    has_journal:
      patch.has_journal ?? (existing as DailyActivity | null)?.has_journal ?? false,
    step_source: patch.step_source ?? 'manual',
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('member_daily_activity')
    .upsert(row, { onConflict: 'member_id,activity_date' })

  if (error) throw error
  return {
    step_count: row.step_count,
    has_pt_attendance: row.has_pt_attendance,
    has_journal: row.has_journal,
  }
}

/** 오늘 걸음 OCR 승인 여부 */
export async function hasApprovedStepsToday(
  memberId: string,
  date: string = todayDateString(),
): Promise<boolean> {
  const { data, error } = await supabase
    .from('step_verifications')
    .select('id')
    .eq('member_id', memberId)
    .eq('verification_date', date)
    .eq('status', 'approved')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

/** OCR 승인 후 걸음 구간별 리워드 적립 (같은 날 1회) */
export async function awardStepRewardsFromVerification(
  memberId: string,
  stepCount: number,
  date: string,
  verificationId: string,
): Promise<StepRewardResult> {
  if (stepCount < 0) throw new Error('걸음 수가 올바르지 않습니다.')

  await upsertDailyActivity(memberId, date, {
    step_count: stepCount,
    step_source: 'ocr_verification',
  })

  const rules = await fetchRewardEarnRules()
  const planned = computeStepTierAwards(stepCount, rules)
  const awards: StepRewardTierAward[] = []

  for (const tier of planned) {
    const eventKey = `${tier.eventType}:${memberId}:${date}`
    try {
      await awardPair(
        memberId,
        tier.eventType,
        eventKey,
        tier.score,
        tier.mile,
        {
          reference_type: 'step_verifications',
          reference_id: verificationId,
          note: `걸음 OCR 인증 ${tier.minSteps.toLocaleString()}보`,
          created_by: 'ocr_auto',
        },
      )
      awards.push(tier)
    } catch (err) {
      if (err instanceof Error && err.message === 'ALREADY_AWARDED') continue
      throw err
    }
  }

  await checkStreakReward(memberId)

  try {
    await earnGrowthOnStepVerification(memberId, stepCount, date)
  } catch (err) {
    console.warn('걸음 성장·도토리 적립 실패:', err)
  }

  const totalScore = awards.reduce((sum, row) => sum + row.score, 0)
  const totalMile = awards.reduce((sum, row) => sum + row.mile, 0)

  return { stepCount, awards, totalScore, totalMile }
}

function isQualifyingDay(activity: DailyActivity): boolean {
  return activity.has_pt_attendance || activity.step_count >= MIN_STEPS_FOR_VERIFICATION
}

async function checkStreakReward(memberId: string): Promise<void> {
  const rules = await fetchRewardEarnRules()
  const endDate = todayDateString()

  const dates: string[] = []
  const base = new Date(`${endDate}T12:00:00`)
  for (let i = 0; i < STREAK_DAYS; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  const { data, error } = await supabase
    .from('member_daily_activity')
    .select('activity_date, step_count, has_pt_attendance, has_journal')
    .eq('member_id', memberId)
    .in('activity_date', dates)

  if (error) throw error

  const byDate = new Map(
    ((data ?? []) as (DailyActivity & { activity_date: string })[]).map((r) => [
      r.activity_date,
      r,
    ]),
  )

  for (const date of dates) {
    const activity = byDate.get(date)
    if (!activity || !isQualifyingDay(activity)) return
  }

  const eventKey = `streak_7day:${memberId}:${endDate}`
  try {
    await awardPair(
      memberId,
      'streak_7day',
      eventKey,
      rules.streak_7day.score,
      rules.streak_7day.mile,
      { note: `${STREAK_DAYS}일 연속 활동 달성` },
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_AWARDED') return
    throw err
  }
}

/** 네이버 리뷰 (관리자 수동 트리거) */
export async function awardNaverReview(
  memberId: string,
  adminNote?: string,
): Promise<void> {
  const rules = await fetchRewardEarnRules()
  const eventKey = `naver_review:${memberId}:${Date.now()}`
  await awardPair(
    memberId,
    'naver_review',
    eventKey,
    rules.naver_review.score,
    rules.naver_review.mile,
    { note: adminNote ?? '네이버 리뷰 작성', created_by: 'admin' },
  )
}

/** 지인 소개 결제 보상 (최초 1회) */
export async function awardReferralOnPayment(
  referredMemberId: string,
  paymentId: string,
  paymentAmount: number,
): Promise<void> {
  const { data: existing } = await supabase
    .from('member_referral_rewards')
    .select('id')
    .eq('referred_member_id', referredMemberId)
    .maybeSingle()

  if (existing) return

  const { data: member, error } = await supabase
    .from('members')
    .select('referred_by_member_id')
    .eq('id', referredMemberId)
    .single()

  if (error) throw error
  const referrerId = (member as { referred_by_member_id: string | null })
    ?.referred_by_member_id
  if (!referrerId) return

  const rules = await fetchRewardEarnRules()
  const percent = rules.referral_percent ?? 10
  const mileAmount = Math.floor((paymentAmount * percent) / 100)
  if (mileAmount <= 0) return

  const eventKey = `referral:${referredMemberId}:${paymentId}`

  await awardPair(
    referrerId,
    'referral_referrer',
    `${eventKey}:referrer`,
    0,
    mileAmount,
    {
      reference_type: 'payment_history',
      reference_id: paymentId,
      note: `소개 회원 결제 ${percent}%`,
      created_by: 'system',
    },
  )

  await awardPair(
    referredMemberId,
    'referral_new_member',
    `${eventKey}:new`,
    0,
    mileAmount,
    {
      reference_type: 'payment_history',
      reference_id: paymentId,
      note: `신규 가입 소개 혜택 ${percent}%`,
      created_by: 'system',
    },
  )

  await supabase.from('member_referral_rewards').insert({
    referred_member_id: referredMemberId,
    referrer_member_id: referrerId,
    payment_id: paymentId,
  })
}

function calcCustomRuleAward(
  rule: CustomRewardRule,
  paymentAmount: number,
): { score: number; mile: number; note: string } {
  if (rule.value_type === 'payment_percent') {
    const mile =
      rule.mile > 0 ? Math.floor((paymentAmount * rule.mile) / 100) : 0
    const note =
      rule.mile > 0
        ? `${rule.label} (결제금액 ${rule.mile}%)`
        : rule.label
    return { score: rule.score, mile, note }
  }

  return {
    score: rule.score,
    mile: rule.mile,
    note: rule.label,
  }
}

async function awardMatchingCustomRules(
  memberId: string,
  trigger: CustomRewardTrigger,
  referenceId: string,
  options?: {
    paymentAmount?: number
    category?: PaymentCategory
  },
): Promise<void> {
  const rules = await fetchRewardEarnRules()

  for (const rule of rules.custom_rules) {
    if (!rule.is_active || rule.trigger !== trigger) continue

    if (trigger === 'payment_completed') {
      const category = options?.category ?? 'pt'
      if (
        rule.payment_categories &&
        rule.payment_categories.length > 0 &&
        !rule.payment_categories.includes(category)
      ) {
        continue
      }
    } else if (rule.value_type === 'payment_percent') {
      continue
    }

    const paymentAmount = options?.paymentAmount ?? 0
    const { score, mile, note } = calcCustomRuleAward(rule, paymentAmount)
    if (score <= 0 && mile <= 0) continue

    const eventKey = rule.once_per_member
      ? `custom_once:${rule.id}:${memberId}`
      : `custom:${rule.id}:${trigger}:${referenceId}`

    try {
      await awardPair(memberId, 'custom_reward', eventKey, score, mile, {
        reference_type: CUSTOM_RULE_REFERENCE_TYPES[trigger],
        reference_id: referenceId,
        note,
        created_by: 'system',
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'ALREADY_AWARDED') continue
      throw err
    }
  }
}

/** 관리자 정의 추가 적립 규칙 (결제 완료 등) */
export async function awardCustomRulesOnPayment(
  memberId: string,
  paymentId: string,
  paymentAmount: number,
  category: PaymentCategory = 'pt',
): Promise<void> {
  await awardMatchingCustomRules(memberId, 'payment_completed', paymentId, {
    paymentAmount,
    category,
  })
}

export async function awardCustomRulesOnFacilityCheckin(
  memberId: string,
  checkinId: string,
): Promise<void> {
  await awardMatchingCustomRules(memberId, 'facility_checkin', checkinId)
}

export async function awardCustomRulesOnAttendance(
  memberId: string,
  attendanceId: string,
): Promise<void> {
  await awardMatchingCustomRules(memberId, 'attendance_completed', attendanceId)
}

export async function awardCustomRulesOnExerciseJournal(
  memberId: string,
  journalId: string,
): Promise<void> {
  await awardMatchingCustomRules(memberId, 'exercise_journal', journalId)
}

export async function awardCustomRulesOnCenterPhotoApproved(
  memberId: string,
  submissionId: string,
): Promise<void> {
  await awardMatchingCustomRules(
    memberId,
    'center_photo_approved',
    submissionId,
  )
}

export async function awardCustomRulesOnMemberRegistered(
  memberId: string,
): Promise<void> {
  await awardMatchingCustomRules(memberId, 'member_registered', memberId)
}

/** 재등록 결제 시 MILE 사용 */
export async function redeemMilesForPayment(
  memberId: string,
  paymentAmount: number,
  milesToUse: number,
  paymentId: string,
): Promise<{ milesUsed: number; cashAmount: number }> {
  if (milesToUse < 0) throw new Error('사용 MILE은 0 이상이어야 합니다.')

  const maxUsable = Math.floor((paymentAmount * REDEMPTION_MAX_PERCENT) / 100)
  const milesUsed = Math.min(milesToUse, maxUsable)

  await processMileExpiry(memberId)
  const balance = await ensureBalance(memberId)

  if (milesUsed > balance.move_mile) {
    throw new Error(
      `보유 MILE(${balance.move_mile.toLocaleString()}M)이 부족합니다.`,
    )
  }
  if (milesUsed > maxUsable) {
    throw new Error(
      `결제금액의 최대 ${REDEMPTION_MAX_PERCENT}%(${maxUsable.toLocaleString()}원)까지 사용 가능합니다.`,
    )
  }

  if (milesUsed === 0) {
    return { milesUsed: 0, cashAmount: paymentAmount }
  }

  let remaining = milesUsed
  const { data: lots, error: lotsError } = await supabase
    .from('reward_mile_lots')
    .select('id, remaining_amount')
    .eq('member_id', memberId)
    .gt('remaining_amount', 0)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })

  if (lotsError) throw lotsError

  for (const lot of (lots ?? []) as { id: string; remaining_amount: number }[]) {
    if (remaining <= 0) break
    const deduct = Math.min(remaining, lot.remaining_amount)
    remaining -= deduct
    await supabase
      .from('reward_mile_lots')
      .update({ remaining_amount: lot.remaining_amount - deduct })
      .eq('id', lot.id)
  }

  const newMile = balance.move_mile - milesUsed
  await insertTransaction({
    member_id: memberId,
    currency: 'move_mile',
    amount: -milesUsed,
    balance_after: newMile,
    event_type: 'redemption',
    event_key: `redemption:${paymentId}`,
    reference_type: 'payment_history',
    reference_id: paymentId,
    note: `재등록 결제 ${milesUsed.toLocaleString()}M 사용`,
    created_by: 'system',
  })
  await updateBalance(memberId, balance.move_score, newMile)

  return { milesUsed, cashAmount: paymentAmount - milesUsed }
}

export function calcMaxRedeemableMiles(paymentAmount: number, availableMiles: number): number {
  const maxByPercent = Math.floor((paymentAmount * REDEMPTION_MAX_PERCENT) / 100)
  return Math.min(maxByPercent, availableMiles)
}

/** 관리자 수동 적립/차감 */
export async function manualRewardAdjust(input: {
  memberId: string
  currency: RewardCurrency
  amount: number
  note: string
  adminLabel?: string
}): Promise<RewardBalance> {
  if (input.amount === 0) throw new Error('금액을 입력해 주세요.')

  await processMileExpiry(input.memberId)
  const balance = await ensureBalance(input.memberId)

  if (input.currency === 'move_score') {
    const newScore = Math.max(0, balance.move_score + input.amount)
    if (input.amount < 0 && newScore === balance.move_score && balance.move_score > 0) {
      throw new Error('차감할 SCORE가 부족합니다.')
    }
    await insertTransaction({
      member_id: input.memberId,
      currency: 'move_score',
      amount: input.amount,
      balance_after: newScore,
      event_type: 'manual_adjust',
      event_key: `manual:${input.memberId}:${Date.now()}:score`,
      note: input.note,
      created_by: input.adminLabel ?? 'admin',
    })
    await updateBalance(input.memberId, newScore, balance.move_mile)
  } else {
    const newMile = Math.max(0, balance.move_mile + input.amount)
    if (input.amount < 0 && balance.move_mile + input.amount < 0) {
      throw new Error('차감할 MILE이 부족합니다.')
    }

    const txn = await insertTransaction({
      member_id: input.memberId,
      currency: 'move_mile',
      amount: input.amount,
      balance_after: newMile,
      event_type: 'manual_adjust',
      event_key: `manual:${input.memberId}:${Date.now()}:mile`,
      note: input.note,
      created_by: input.adminLabel ?? 'admin',
    })

    if (input.amount > 0) {
      const expiresAt = addMonths(new Date().toISOString(), MILE_EXPIRY_MONTHS)
      await createMileLot(input.memberId, input.amount, txn.id, expiresAt)
      await supabase
        .from('reward_transactions')
        .update({ expires_at: expiresAt })
        .eq('id', txn.id)
    } else if (input.amount < 0) {
      let remaining = Math.abs(input.amount)
      const { data: lots } = await supabase
        .from('reward_mile_lots')
        .select('id, remaining_amount')
        .eq('member_id', input.memberId)
        .gt('remaining_amount', 0)
        .order('expires_at', { ascending: true })
      for (const lot of (lots ?? []) as { id: string; remaining_amount: number }[]) {
        if (remaining <= 0) break
        const deduct = Math.min(remaining, lot.remaining_amount)
        remaining -= deduct
        await supabase
          .from('reward_mile_lots')
          .update({ remaining_amount: lot.remaining_amount - deduct })
          .eq('id', lot.id)
      }
    }

    await updateBalance(input.memberId, balance.move_score, newMile)
  }

  return fetchRewardBalance(input.memberId)
}

export type MemberRewardSummary = {
  member_id: string
  member_name: string
  move_score: number
  move_mile: number
  tier: RewardTier
}

export async function fetchAllRewardBalances(): Promise<MemberRewardSummary[]> {
  const centerId = await getCurrentCenterId()
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name')
    .eq('center_id', centerId)
    .order('name')

  if (membersError) throw membersError

  const memberIds = ((members ?? []) as { id: string }[]).map((m) => m.id)
  if (memberIds.length === 0) return []

  await Promise.all(memberIds.map((id) => reconcileRewardBalance(id)))

  const { data: balances, error: balError } = await supabase
    .from('reward_balances')
    .select('member_id, move_score, move_mile')
    .in('member_id', memberIds)

  if (balError) throw balError

  const balMap = new Map(
    ((balances ?? []) as { member_id: string; move_score: number; move_mile: number }[]).map(
      (b) => [b.member_id, b],
    ),
  )

  return ((members ?? []) as { id: string; name: string }[]).map((m) => {
    const b = balMap.get(m.id)
    const score = b?.move_score ?? 0
    return {
      member_id: m.id,
      member_name: m.name,
      move_score: score,
      move_mile: b?.move_mile ?? 0,
      tier: getTierFromScore(score),
    }
  })
}
