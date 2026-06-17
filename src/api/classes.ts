import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { awardGrowthOnGroupClassAttendance } from './growth'

export type ClassType = 'pilates' | 'yoga' | 'gx' | 'group_pt'
export type PassType = ClassType | 'none'
export type ClassStatus = 'active' | 'inactive'
export type ScheduleStatus = 'scheduled' | 'cancelled' | 'completed'
export type ReservationStatus =
  | 'reserved'
  | 'waitlist'
  | 'cancelled'
  | 'attended'
  | 'noshow'

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  pilates: '필라테스',
  yoga: '요가',
  gx: 'GX',
  group_pt: '소그룹 PT',
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  reserved: '예약',
  waitlist: '대기',
  cancelled: '취소',
  attended: '출석',
  noshow: '노쇼',
}

export type FitnessClass = {
  id: string
  center_id: string
  name: string
  description: string | null
  trainer_id: string | null
  capacity: number
  duration_minutes: number
  color: string
  class_type: ClassType
  pass_type: PassType
  deduct_sessions: boolean
  waitlist_enabled: boolean
  status: ClassStatus
  created_at: string
  updated_at: string
  trainer_name?: string
}

export type ClassSchedule = {
  id: string
  center_id: string
  class_id: string
  starts_at: string
  ends_at: string
  capacity: number | null
  status: ScheduleStatus
  note: string | null
  created_at: string
  updated_at: string
  class_name?: string
  class_type?: ClassType
  class_color?: string
  pass_type?: PassType
  deduct_sessions?: boolean
  trainer_name?: string
  reserved_count?: number
  waitlist_count?: number
}

export type ClassReservation = {
  id: string
  center_id: string
  schedule_id: string
  member_id: string
  status: ReservationStatus
  reserved_at: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
  member_name?: string
  member_phone?: string
}

export const MEMBER_CANCEL_HOURS = 24

export function canMemberCancelReservation(startsAtIso: string, now = new Date()): boolean {
  const starts = new Date(startsAtIso)
  const cutoff = new Date(starts.getTime() - MEMBER_CANCEL_HOURS * 60 * 60 * 1000)
  return now < cutoff
}

export function classRequiresSessionPass(passType: PassType, deductSessions: boolean): boolean {
  return deductSessions && passType !== 'none'
}

function passTypeLabel(passType: PassType): string {
  if (passType === 'none') return '수강권'
  return CLASS_TYPE_LABELS[passType]
}

async function countPendingReservationsForPassType(
  memberId: string,
  centerId: string,
  passType: PassType,
): Promise<number> {
  const { data, error } = await supabase
    .from('class_reservations')
    .select('id, class_schedules(classes(pass_type))')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .in('status', ['reserved', 'waitlist'])

  if (error) throw error

  return (data ?? []).filter((row) => {
    const cls = (row as { class_schedules?: { classes?: { pass_type?: PassType } | null } | null })
      .class_schedules?.classes
    return cls?.pass_type === passType
  }).length
}

async function assertMemberCanReserveClass(input: {
  memberId: string
  centerId: string
  passType: PassType
  deductSessions: boolean
}): Promise<void> {
  if (!classRequiresSessionPass(input.passType, input.deductSessions)) return

  const passType = input.passType as ClassType
  const pendingCount = await countPendingReservationsForPassType(
    input.memberId,
    input.centerId,
    input.passType,
  )

  const { data: pass, error: passError } = await supabase
    .from('member_session_passes')
    .select('remaining_sessions, is_unlimited')
    .eq('center_id', input.centerId)
    .eq('member_id', input.memberId)
    .eq('pass_type', passType)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (passError) throw passError

  if (pass?.is_unlimited) return

  const passRemaining = pass ? Number(pass.remaining_sessions ?? 0) - pendingCount : 0
  if (passRemaining > 0) return

  if (passType === 'group_pt') {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('remaining_sessions')
      .eq('id', input.memberId)
      .single()

    if (memberError) throw memberError
    const ptRemaining = Number(member?.remaining_sessions ?? 0) - pendingCount
    if (ptRemaining > 0) return
  }

  const label = passTypeLabel(input.passType)
  if (!pass) {
    throw new Error(`${label} 수강권이 없습니다. 결제·수강권 지급 후 예약할 수 있습니다.`)
  }
  throw new Error(
    `${label} 잔여 횟수가 부족합니다. (보유 ${pass.remaining_sessions ?? 0}회, 예약 대기 ${pendingCount}건)`,
  )
}

export async function fetchClasses(): Promise<FitnessClass[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('classes')
    .select('*, trainers(name)')
    .eq('center_id', centerId)
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => {
    const trainers = row.trainers as { name?: string } | null
    const { trainers: _t, ...rest } = row
    return {
      ...(rest as FitnessClass),
      trainer_name: trainers?.name ?? undefined,
    }
  })
}

export async function createClass(input: {
  name: string
  description?: string
  trainer_id?: string | null
  capacity?: number
  duration_minutes?: number
  color?: string
  class_type: ClassType
  pass_type?: PassType
  deduct_sessions?: boolean
  waitlist_enabled?: boolean
}): Promise<FitnessClass> {
  const centerId = await getCurrentCenterId()
  const payload = {
    center_id: centerId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    trainer_id: input.trainer_id || null,
    capacity: input.capacity ?? 8,
    duration_minutes: input.duration_minutes ?? 60,
    color: input.color ?? '#2dd4bf',
    class_type: input.class_type,
    pass_type: input.pass_type ?? input.class_type,
    deduct_sessions: input.deduct_sessions ?? true,
    waitlist_enabled: input.waitlist_enabled ?? false,
    status: 'active' as const,
  }

  const { data, error } = await supabase.from('classes').insert(payload).select('*').single()
  if (error) throw error
  return data as FitnessClass
}

export async function updateClass(
  id: string,
  input: Partial<Omit<FitnessClass, 'id' | 'center_id' | 'created_at' | 'updated_at'>>,
): Promise<FitnessClass> {
  const { data, error } = await supabase
    .from('classes')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as FitnessClass
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from('classes').update({ status: 'inactive' }).eq('id', id)
  if (error) throw error
}

export async function fetchClassSchedulesInRange(
  startIso: string,
  endIso: string,
): Promise<ClassSchedule[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('class_schedules')
    .select('*, classes(name, class_type, color, capacity, pass_type, deduct_sessions, trainers(name))')
    .eq('center_id', centerId)
    .gte('starts_at', startIso)
    .lte('starts_at', endIso)
    .neq('status', 'cancelled')
    .order('starts_at')

  if (error) throw error

  const schedules = (data ?? []).map((row) => {
    const cls = row.classes as {
      name?: string
      class_type?: ClassType
      color?: string
      capacity?: number
      pass_type?: PassType
      deduct_sessions?: boolean
      trainers?: { name?: string } | null
    } | null
    const { classes: _c, ...rest } = row
    const schedule = rest as ClassSchedule
    return {
      ...schedule,
      capacity: schedule.capacity ?? cls?.capacity ?? 8,
      class_name: cls?.name,
      class_type: cls?.class_type,
      class_color: cls?.color,
      pass_type: cls?.pass_type,
      deduct_sessions: cls?.deduct_sessions,
      trainer_name: cls?.trainers?.name ?? undefined,
    }
  })

  if (schedules.length === 0) return schedules

  const ids = schedules.map((s) => s.id)
  const { data: counts, error: countError } = await supabase
    .from('class_reservations')
    .select('schedule_id, status')
    .in('schedule_id', ids)
    .in('status', ['reserved', 'waitlist', 'attended', 'noshow'])

  if (countError) throw countError

  const reservedMap = new Map<string, number>()
  const waitlistMap = new Map<string, number>()
  for (const row of (counts ?? []) as Array<{ schedule_id: string; status: string }>) {
    if (row.status === 'waitlist') {
      waitlistMap.set(row.schedule_id, (waitlistMap.get(row.schedule_id) ?? 0) + 1)
    } else if (row.status !== 'cancelled') {
      reservedMap.set(row.schedule_id, (reservedMap.get(row.schedule_id) ?? 0) + 1)
    }
  }

  return schedules.map((s) => ({
    ...s,
    reserved_count: reservedMap.get(s.id) ?? 0,
    waitlist_count: waitlistMap.get(s.id) ?? 0,
  }))
}

export async function createClassSchedule(input: {
  class_id: string
  starts_at: string
  ends_at: string
  capacity?: number | null
  note?: string
}): Promise<ClassSchedule> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('class_schedules')
    .insert({
      center_id: centerId,
      class_id: input.class_id,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      capacity: input.capacity ?? null,
      note: input.note?.trim() || null,
      status: 'scheduled',
    })
    .select('*')
    .single()

  if (error) throw error
  return data as ClassSchedule
}

export async function cancelClassSchedule(scheduleId: string): Promise<void> {
  const { error: reservationError } = await supabase
    .from('class_reservations')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('schedule_id', scheduleId)
    .in('status', ['reserved', 'waitlist'])

  if (reservationError) throw reservationError

  const { error } = await supabase
    .from('class_schedules')
    .update({ status: 'cancelled' })
    .eq('id', scheduleId)

  if (error) throw error
}

export async function fetchScheduleReservations(scheduleId: string): Promise<ClassReservation[]> {
  const { data, error } = await supabase
    .from('class_reservations')
    .select('*, members(name, phone)')
    .eq('schedule_id', scheduleId)
    .order('reserved_at')

  if (error) throw error

  return (data ?? []).map((row) => {
    const member = row.members as { name?: string; phone?: string } | null
    const { members: _m, ...rest } = row
    return {
      ...(rest as ClassReservation),
      member_name: member?.name,
      member_phone: member?.phone,
    }
  })
}

async function getScheduleCapacity(scheduleId: string): Promise<{
  capacity: number
  reserved: number
  waitlist: number
  waitlistEnabled: boolean
  startsAt: string
  passType: PassType
  deductSessions: boolean
}> {
  const { data: schedule, error } = await supabase
    .from('class_schedules')
    .select('capacity, starts_at, classes(capacity, waitlist_enabled, pass_type, deduct_sessions)')
    .eq('id', scheduleId)
    .single()

  if (error || !schedule) throw new Error('수업 일정을 찾을 수 없습니다.')

  const scheduleRow = schedule as {
    capacity: number | null
    starts_at: string
    classes: {
      capacity?: number
      waitlist_enabled?: boolean
      pass_type?: PassType
      deduct_sessions?: boolean
    } | null
  }

  const cls = scheduleRow.classes
  const capacity = Number(scheduleRow.capacity ?? cls?.capacity ?? 8)

  const { data: reservations, error: resError } = await supabase
    .from('class_reservations')
    .select('status')
    .eq('schedule_id', scheduleId)
    .in('status', ['reserved', 'waitlist', 'attended', 'noshow'])

  if (resError) throw resError

  let reserved = 0
  let waitlist = 0
  for (const r of reservations ?? []) {
    if (r.status === 'waitlist') waitlist += 1
    else if (r.status !== 'cancelled') reserved += 1
  }

  return {
    capacity,
    reserved,
    waitlist,
    waitlistEnabled: cls?.waitlist_enabled ?? false,
    startsAt: String(scheduleRow.starts_at),
    passType: cls?.pass_type ?? 'pilates',
    deductSessions: cls?.deduct_sessions ?? true,
  }
}

export async function reserveClassForMember(input: {
  scheduleId: string
  memberId: string
  asMember?: boolean
}): Promise<ClassReservation> {
  const info = await getScheduleCapacity(input.scheduleId)

  if (new Date(info.startsAt) <= new Date()) {
    throw new Error('이미 시작된 수업은 예약할 수 없습니다.')
  }

  const centerId = await getCurrentCenterId(input.memberId)
  await assertMemberCanReserveClass({
    memberId: input.memberId,
    centerId,
    passType: info.passType,
    deductSessions: info.deductSessions,
  })

  let status: ReservationStatus = 'reserved'

  if (info.reserved >= info.capacity) {
    if (info.waitlistEnabled) {
      status = 'waitlist'
    } else {
      throw new Error('정원이 마감되었습니다.')
    }
  }

  const { data, error } = await supabase
    .from('class_reservations')
    .insert({
      center_id: centerId,
      schedule_id: input.scheduleId,
      member_id: input.memberId,
      status,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('이미 예약된 수업입니다.')
    throw error
  }

  return data as ClassReservation
}

export async function cancelClassReservation(input: {
  reservationId: string
  asMember?: boolean
  scheduleStartsAt?: string
}): Promise<ClassReservation> {
  if (input.asMember && input.scheduleStartsAt) {
    if (!canMemberCancelReservation(input.scheduleStartsAt)) {
      throw new Error('수업 24시간 전까지만 회원 취소가 가능합니다.')
    }
  }

  const { data, error } = await supabase
    .from('class_reservations')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', input.reservationId)
    .select('*')
    .single()

  if (error) throw error
  return data as ClassReservation
}

export async function updateReservationStatus(input: {
  reservationId: string
  status: ReservationStatus
  scheduleId: string
  classId: string
  memberId: string
  checkedBy?: string
}): Promise<void> {
  const { data: cls, error: classError } = await supabase
    .from('classes')
    .select('deduct_sessions, pass_type')
    .eq('id', input.classId)
    .single()

  if (classError) throw classError

  const { error: resError } = await supabase
    .from('class_reservations')
    .update({ status: input.status })
    .eq('id', input.reservationId)

  if (resError) throw resError

  if (input.status === 'attended') {
    let sessionsDeducted = 0

    if (cls?.deduct_sessions && cls.pass_type !== 'none') {
      const passType = cls.pass_type as ClassType
      const { data: pass } = await supabase
        .from('member_session_passes')
        .select('*')
        .eq('member_id', input.memberId)
        .eq('pass_type', passType)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pass && !pass.is_unlimited && Number(pass.remaining_sessions ?? 0) > 0) {
        const remaining = Number(pass.remaining_sessions ?? 0) - 1
        await supabase
          .from('member_session_passes')
          .update({ remaining_sessions: remaining })
          .eq('id', String(pass.id))
        sessionsDeducted = 1
      } else if (passType === 'group_pt') {
        const { data: member } = await supabase
          .from('members')
          .select('remaining_sessions')
          .eq('id', input.memberId)
          .single()
        if (member && member.remaining_sessions > 0) {
          await supabase
            .from('members')
            .update({ remaining_sessions: member.remaining_sessions - 1 })
            .eq('id', input.memberId)
          sessionsDeducted = 1
        }
      }
    }

    const centerId = await getCurrentCenterId()
    const { data: attendanceRow, error: attError } = await supabase
      .from('class_attendance')
      .insert({
        center_id: centerId,
        reservation_id: input.reservationId,
        schedule_id: input.scheduleId,
        member_id: input.memberId,
        status: 'attended',
        sessions_deducted: sessionsDeducted,
        checked_by: input.checkedBy ?? 'admin',
        checked_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle()

    if (attError && attError.code !== '23505') throw attError

    if (attendanceRow?.id) {
      void awardGrowthOnGroupClassAttendance(
        input.memberId,
        String(attendanceRow.id),
      )
    }
  }
}

export async function fetchMemberClassSchedules(
  memberId: string,
  startIso: string,
  endIso: string,
): Promise<Array<ClassSchedule & { reservation_id?: string; reservation_status?: ReservationStatus }>> {
  const centerId = await getCurrentCenterId()
  const schedules = await fetchClassSchedulesInRange(startIso, endIso)

  const { data: reservations, error } = await supabase
    .from('class_reservations')
    .select('id, schedule_id, status')
    .eq('center_id', centerId)
    .eq('member_id', memberId)
    .in('status', ['reserved', 'waitlist', 'attended', 'noshow'])

  if (error) throw error

  const resMap = new Map<string, { id: string; status: ReservationStatus }>(
    ((reservations ?? []) as Array<{ id: string; schedule_id: string; status: string }>).map(
      (r) => [r.schedule_id, { id: r.id, status: r.status as ReservationStatus }],
    ),
  )

  return schedules.map((s) => {
    const res = resMap.get(s.id)
    return {
      ...s,
      reservation_id: res?.id,
      reservation_status: res?.status,
    }
  })
}

export async function fetchClassDashboardStats(dateIso: string): Promise<{
  todayClassCount: number
  todayReservationCount: number
  avgFillRate: number
  attendanceRate: number
  noshowRate: number
  popularClasses: Array<{ name: string; count: number }>
}> {
  const dayStart = `${dateIso}T00:00:00`
  const dayEnd = `${dateIso}T23:59:59`
  const schedules = await fetchClassSchedulesInRange(dayStart, dayEnd)

  const scheduleIds = schedules.map((s) => s.id)
  if (scheduleIds.length === 0) {
    return {
      todayClassCount: 0,
      todayReservationCount: 0,
      avgFillRate: 0,
      attendanceRate: 0,
      noshowRate: 0,
      popularClasses: [],
    }
  }

  const { data: reservations, error } = await supabase
    .from('class_reservations')
    .select('schedule_id, status')
    .in('schedule_id', scheduleIds)

  if (error) throw error

  const scheduleNameMap = new Map(schedules.map((s) => [s.id, s.class_name ?? '수업']))

  let reserved = 0
  let attended = 0
  let noshow = 0
  const classCounts = new Map<string, number>()

  for (const row of (reservations ?? []) as Array<{ schedule_id: string; status: string }>) {
    if (row.status === 'cancelled') continue
    reserved += 1
    if (row.status === 'attended') attended += 1
    if (row.status === 'noshow') noshow += 1
    const name = scheduleNameMap.get(row.schedule_id) ?? '수업'
    classCounts.set(name, (classCounts.get(name) ?? 0) + 1)
  }

  const totalCapacity = schedules.reduce(
    (sum, s) => sum + (s.capacity ?? 8),
    0,
  )

  const popularClasses = [...classCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const decided = attended + noshow

  return {
    todayClassCount: schedules.length,
    todayReservationCount: reserved,
    avgFillRate: totalCapacity > 0 ? Math.round((reserved / totalCapacity) * 100) : 0,
    attendanceRate: decided > 0 ? Math.round((attended / decided) * 100) : 0,
    noshowRate: decided > 0 ? Math.round((noshow / decided) * 100) : 0,
    popularClasses,
  }
}
