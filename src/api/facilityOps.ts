import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { todayDateString } from './members'

export type LockerStatus = 'active' | 'expired' | 'cancelled'
export type TowelStatus = 'rented' | 'returned' | 'lost'

export type LockerAssignment = {
  id: string
  center_id: string
  member_id: string | null
  locker_number: string
  starts_at: string
  ends_at: string
  status: LockerStatus
  note: string | null
  created_at: string
  updated_at: string
  member_name?: string
}

export type TowelRental = {
  id: string
  center_id: string
  member_id: string | null
  rented_at: string
  returned_at: string | null
  status: TowelStatus
  note: string | null
  created_at: string
  member_name?: string
}

export type FacilityCheckin = {
  id: string
  center_id: string
  member_id: string
  checked_in_at: string
  note: string | null
  created_at: string
  member_name?: string
}

export async function fetchLockerAssignments(): Promise<LockerAssignment[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('locker_assignments')
    .select('*, members(name)')
    .eq('center_id', centerId)
    .order('ends_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const member = row.members as { name?: string } | null
    const { members: _m, ...rest } = row
    return { ...(rest as LockerAssignment), member_name: member?.name }
  })
}

export async function createLockerAssignment(input: {
  member_id?: string | null
  locker_number: string
  starts_at: string
  ends_at: string
  note?: string
}): Promise<LockerAssignment> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('locker_assignments')
    .insert({
      center_id: centerId,
      member_id: input.member_id || null,
      locker_number: input.locker_number.trim(),
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      status: 'active',
      note: input.note?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as LockerAssignment
}

export async function fetchActiveTowelRentals(): Promise<TowelRental[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('towel_rentals')
    .select('*, members(name)')
    .eq('center_id', centerId)
    .eq('status', 'rented')
    .order('rented_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const member = row.members as { name?: string } | null
    const { members: _m, ...rest } = row
    return { ...(rest as TowelRental), member_name: member?.name }
  })
}

export async function rentTowel(input: {
  member_id?: string | null
  note?: string
}): Promise<TowelRental> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('towel_rentals')
    .insert({
      center_id: centerId,
      member_id: input.member_id || null,
      status: 'rented',
      note: input.note?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as TowelRental
}

export async function returnTowel(id: string): Promise<TowelRental> {
  const { data, error } = await supabase
    .from('towel_rentals')
    .update({ status: 'returned', returned_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as TowelRental
}

export async function fetchTodayFacilityCheckins(): Promise<FacilityCheckin[]> {
  const centerId = await getCurrentCenterId()
  const today = todayDateString()
  const { data, error } = await supabase
    .from('facility_checkins')
    .select('*, members(name)')
    .eq('center_id', centerId)
    .gte('checked_in_at', `${today}T00:00:00`)
    .lte('checked_in_at', `${today}T23:59:59`)
    .order('checked_in_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const member = row.members as { name?: string } | null
    const { members: _m, ...rest } = row
    return { ...(rest as FacilityCheckin), member_name: member?.name }
  })
}

export async function checkInFacility(input: {
  member_id: string
  note?: string
}): Promise<FacilityCheckin> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('facility_checkins')
    .insert({
      center_id: centerId,
      member_id: input.member_id,
      note: input.note?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as FacilityCheckin
}

export async function fetchFacilityStats(): Promise<{
  activeLockers: number
  expiringLockers: number
  rentedTowels: number
  todayCheckins: number
}> {
  const centerId = await getCurrentCenterId()
  const today = todayDateString()
  const in7days = new Date()
  in7days.setDate(in7days.getDate() + 7)
  const soon = in7days.toISOString().slice(0, 10)

  const [lockers, towels, checkins] = await Promise.all([
    supabase
      .from('locker_assignments')
      .select('id, ends_at')
      .eq('center_id', centerId)
      .eq('status', 'active'),
    supabase
      .from('towel_rentals')
      .select('id')
      .eq('center_id', centerId)
      .eq('status', 'rented'),
    supabase
      .from('facility_checkins')
      .select('id')
      .eq('center_id', centerId)
      .gte('checked_in_at', `${today}T00:00:00`),
  ])

  const activeLockers = lockers.data?.length ?? 0
  const expiringLockers =
    (lockers.data as Array<{ ends_at: string }> | null)?.filter((l) => l.ends_at <= soon).length ?? 0

  return {
    activeLockers,
    expiringLockers,
    rentedTowels: towels.data?.length ?? 0,
    todayCheckins: checkins.data?.length ?? 0,
  }
}
