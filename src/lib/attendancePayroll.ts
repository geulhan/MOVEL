import type { Member, Trainer } from '../types/database'
import type { PtSchedule } from '../api/schedule'
import {
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
  settlementRate: number
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

function trainerBucketKey(trainerId: string | null, trainerName: string): string {
  return trainerId ?? `name:${trainerName}`
}

export function buildAttendancePayrollSummary(
  logs: AttendancePayrollLog[],
  members: Member[],
  schedules: PtSchedule[],
  trainers: Trainer[],
  defaultSettlementRate: number,
): AttendancePayrollSummary {
  const memberById = new Map(members.map((member) => [member.id, member]))
  const byTrainer = new Map<
    string,
    {
      trainerId: string | null
      trainerName: string
      count: number
      gross: number
    }
  >()

  for (const log of logs) {
    const member = memberById.get(log.member_id)
    const { trainerId, trainerName } = resolveTrainerForAttendance(
      log,
      member,
      schedules,
      trainers,
    )
    const bucketKey = trainerBucketKey(trainerId, trainerName)
    const unitPrice = member ? memberSessionUnitPrice(member) : 0
    const bucket = byTrainer.get(bucketKey) ?? {
      trainerId,
      trainerName,
      count: 0,
      gross: 0,
    }
    bucket.count += 1
    bucket.gross += unitPrice
    byTrainer.set(bucketKey, bucket)
  }

  const byTrainerRows = [...byTrainer.values()]
    .map((stats) => {
      const settlementRate = resolveTrainerSettlementRate(
        stats.trainerId,
        trainers,
        defaultSettlementRate,
      )
      const trainerPay = Math.round(stats.gross * (settlementRate / 100))
      return {
        trainerId: stats.trainerId,
        trainerName: stats.trainerName,
        settlementRate,
        sessionCount: stats.count,
        grossAmount: stats.gross,
        trainerPay,
        centerShare: stats.gross - trainerPay,
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

  return {
    defaultSettlementRate,
    totalSessions: logs.length,
    totalGross,
    totalTrainerPay,
    totalCenterShare: totalGross - totalTrainerPay,
    byTrainer: byTrainerRows,
  }
}
