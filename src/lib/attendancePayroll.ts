import type { Member } from '../types/database'
import type { PtSchedule } from '../api/schedule'

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
  trainerName: string
  sessionCount: number
  grossAmount: number
  trainerPay: number
  centerShare: number
}

export type AttendancePayrollSummary = {
  settlementRate: number
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

function resolveTrainerForAttendance(
  log: AttendancePayrollLog,
  member: Member | undefined,
  schedules: PtSchedule[],
  trainerNamesById: Map<string, string>,
): string {
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

    if (nearest.trainer_name?.trim()) return nearest.trainer_name.trim()
    if (nearest.trainer_id) {
      return (
        trainerNamesById.get(nearest.trainer_id) ??
        member?.trainer_name?.trim() ??
        '미지정'
      )
    }
  }

  return member?.trainer_name?.trim() || '미지정'
}

export function buildAttendancePayrollSummary(
  logs: AttendancePayrollLog[],
  members: Member[],
  schedules: PtSchedule[],
  trainerNamesById: Map<string, string>,
  settlementRate: number,
): AttendancePayrollSummary {
  const memberById = new Map(members.map((member) => [member.id, member]))
  const byTrainer = new Map<string, { count: number; gross: number }>()

  for (const log of logs) {
    const member = memberById.get(log.member_id)
    const trainerName = resolveTrainerForAttendance(
      log,
      member,
      schedules,
      trainerNamesById,
    )
    const unitPrice = member ? memberSessionUnitPrice(member) : 0
    const bucket = byTrainer.get(trainerName) ?? { count: 0, gross: 0 }
    bucket.count += 1
    bucket.gross += unitPrice
    byTrainer.set(trainerName, bucket)
  }

  const rate = Math.min(100, Math.max(0, settlementRate))
  const byTrainerRows = [...byTrainer.entries()]
    .map(([trainerName, stats]) => {
      const trainerPay = Math.round(stats.gross * (rate / 100))
      return {
        trainerName,
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
    settlementRate: rate,
    totalSessions: logs.length,
    totalGross,
    totalTrainerPay,
    totalCenterShare: totalGross - totalTrainerPay,
    byTrainer: byTrainerRows,
  }
}
