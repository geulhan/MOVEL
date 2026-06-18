import type { Member, Trainer, TrainerSettlementMode } from '../types/database'
import type { PtSchedule } from '../api/schedule'
import type { ClassTrainerSessionPayroll } from '../api/classFixedSchedule'
import {
  calculateTrainerPay,
  formatSettlementLabel,
  resolveTrainerIdByName,
  resolveTrainerSettlementRate,
} from './trainerSettlement'

function isSameCalendarDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function memberSessionUnitPrice(member: Member): number {
  const sessions = Number(member.total_sessions)
  const amount = Number(member.payment_amount)
  if (sessions <= 0 || amount <= 0) return 0
  return Math.round(amount / sessions)
}

export type TrainerPayrollSummaryRow = {
  trainerId: string | null
  trainerName: string
  settlementMode: TrainerSettlementMode
  settlementRate: number | null
  settlementFixedAmount: number | null
  settlementLabel: string
  sessionCount: number
  grossAmount: number
  trainerPay: number
  centerShare: number
}

export type AttendancePayrollSummary = {
  defaultSettlementRate: number
  totalSessions: number
  totalGross: number
  totalTrainerPay: number
  totalCenterShare: number
  byTrainer: TrainerPayrollSummaryRow[]
}

export type AttendancePayrollLog = {
  member_id: string
  checked_in_at: string
}

type TrainerResolution = {
  trainerId: string | null
  trainerName: string
}

function resolveTrainerForAttendance(
  log: AttendancePayrollLog,
  member: Member | undefined,
  schedules: PtSchedule[],
  trainers: Trainer[],
): TrainerResolution {
  const trainerNamesById = new Map(trainers.map((trainer) => [trainer.id, trainer.name]))
  const daySchedules = schedules.filter(
    (schedule) =>
      schedule.member_id === log.member_id &&
      schedule.status !== 'cancelled' &&
      isSameCalendarDay(schedule.scheduled_at, log.checked_in_at),
  )

  if (daySchedules.length > 0) {
    const nearest = [...daySchedules].sort(
      (a, b) =>
        Math.abs(
          new Date(a.scheduled_at).getTime() - new Date(log.checked_in_at).getTime(),
        ) -
        Math.abs(
          new Date(b.scheduled_at).getTime() - new Date(log.checked_in_at).getTime(),
        ),
    )[0]

    if (nearest.trainer_id) {
      return {
        trainerId: nearest.trainer_id,
        trainerName:
          nearest.trainer_name ??
          trainerNamesById.get(nearest.trainer_id) ??
          member?.trainer_name?.trim() ??
          '미지정',
      }
    }

    if (nearest.trainer_name?.trim()) {
      return {
        trainerId: resolveTrainerIdByName(nearest.trainer_name, trainers),
        trainerName: nearest.trainer_name.trim(),
      }
    }
  }

  const memberTrainerId =
    member?.trainer_id ??
    resolveTrainerIdByName(member?.trainer_name, trainers)

  return {
    trainerId: memberTrainerId,
    trainerName: member?.trainer_name?.trim() || '미지정',
  }
}

export function scopePayrollSummaryForTrainer(
  summary: AttendancePayrollSummary,
  trainerId: string | null,
  trainerName: string | null,
): AttendancePayrollSummary {
  const name = trainerName?.trim()
  const row = summary.byTrainer.find(
    (item) =>
      (trainerId && item.trainerId === trainerId) ||
      (name && item.trainerName === name),
  )

  if (!row) {
    return {
      defaultSettlementRate: summary.defaultSettlementRate,
      totalSessions: 0,
      totalGross: 0,
      totalTrainerPay: 0,
      totalCenterShare: 0,
      byTrainer: [],
    }
  }

  return {
    defaultSettlementRate: summary.defaultSettlementRate,
    totalSessions: row.sessionCount,
    totalGross: row.grossAmount,
    totalTrainerPay: row.trainerPay,
    totalCenterShare: row.centerShare,
    byTrainer: [row],
  }
}

export function attendanceRowBelongsToTrainer(
  row: { memberId: string; trainerName: string | null },
  memberById: Map<string, Member>,
  trainerId: string | null,
  trainerName: string | null,
): boolean {
  const name = trainerName?.trim()
  if (!trainerId && !name) return false

  if (name && row.trainerName?.trim() === name) return true

  const member = memberById.get(row.memberId)
  if (trainerId && member?.trainer_id === trainerId) return true
  if (name && member?.trainer_name?.trim() === name) return true

  return false
}

function trainerBucketKey(trainerId: string | null, trainerName: string): string {
  return trainerId ?? `name:${trainerName}`
}

type TrainerBucket = {
  trainerId: string | null
  trainerName: string
  count: number
  gross: number
}

function addToBucket(
  byTrainer: Map<string, TrainerBucket>,
  trainerId: string | null,
  trainerName: string,
  grossDelta: number,
  countDelta: number,
) {
  const bucketKey = trainerBucketKey(trainerId, trainerName)
  const bucket = byTrainer.get(bucketKey) ?? {
    trainerId,
    trainerName,
    count: 0,
    gross: 0,
  }
  bucket.count += countDelta
  bucket.gross += grossDelta
  byTrainer.set(bucketKey, bucket)
}

export function buildAttendancePayrollSummary(
  logs: AttendancePayrollLog[],
  members: Member[],
  schedules: PtSchedule[],
  trainers: Trainer[],
  defaultSettlementRate: number,
  classSessions: ClassTrainerSessionPayroll[] = [],
): AttendancePayrollSummary {
  const memberById = new Map(members.map((member) => [member.id, member]))
  const byTrainer = new Map<string, TrainerBucket>()

  for (const log of logs) {
    const member = memberById.get(log.member_id)
    const { trainerId, trainerName } = resolveTrainerForAttendance(
      log,
      member,
      schedules,
      trainers,
    )
    const unitPrice = member ? memberSessionUnitPrice(member) : 0
    addToBucket(byTrainer, trainerId, trainerName, unitPrice, 1)
  }

  for (const session of classSessions) {
    addToBucket(
      byTrainer,
      session.trainerId,
      session.trainerName,
      session.grossAmount,
      1,
    )
  }

  const byTrainerRows = [...byTrainer.values()]
    .map((stats) => {
      const pay = calculateTrainerPay({
        gross: stats.gross,
        sessionCount: stats.count,
        trainerId: stats.trainerId,
        trainers,
        defaultRate: defaultSettlementRate,
      })
      return {
        trainerId: stats.trainerId,
        trainerName: stats.trainerName,
        settlementMode: pay.settlementMode,
        settlementRate: pay.settlementRate,
        settlementFixedAmount: pay.settlementFixedAmount,
        settlementLabel: formatSettlementLabel({
          settlementMode: pay.settlementMode,
          settlementRate: pay.settlementRate,
          settlementFixedAmount: pay.settlementFixedAmount,
          defaultRate: defaultSettlementRate,
        }),
        sessionCount: stats.count,
        grossAmount: stats.gross,
        trainerPay: pay.trainerPay,
        centerShare: pay.centerShare,
      }
    })
    .sort((a, b) => {
      if (b.sessionCount !== a.sessionCount) {
        return b.sessionCount - a.sessionCount
      }
      return a.trainerName.localeCompare(b.trainerName, 'ko')
    })

  const totalGross = byTrainerRows.reduce((sum, row) => sum + row.grossAmount, 0)
  const totalTrainerPay = byTrainerRows.reduce((sum, row) => sum + row.trainerPay, 0)
  const totalSessions = byTrainerRows.reduce((sum, row) => sum + row.sessionCount, 0)

  return {
    defaultSettlementRate,
    totalSessions,
    totalGross,
    totalTrainerPay,
    totalCenterShare: totalGross - totalTrainerPay,
    byTrainer: byTrainerRows,
  }
}

/** @deprecated settlementLabel 사용 권장 */
export function legacySettlementRateForRow(
  row: TrainerPayrollSummaryRow,
  defaultSettlementRate: number,
): number {
  if (row.settlementMode === 'fixed') return 0
  return row.settlementRate ?? defaultSettlementRate
}

export { resolveTrainerSettlementRate }
