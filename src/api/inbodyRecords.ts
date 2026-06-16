import { resolveCenterIdForMember } from '../lib/center'
import { supabase } from '../lib/supabase'

export type InbodyCreatedBy = 'member' | 'trainer' | 'admin'

export type InbodyRecord = {
  id: string
  member_id: string
  center_id?: string
  measured_at: string
  weight_kg: number
  skeletal_muscle_kg: number
  body_fat_kg: number
  created_by: InbodyCreatedBy
  created_at: string
}

export type InbodyInput = {
  measured_at: string
  weight_kg: number
  skeletal_muscle_kg: number
  body_fat_kg: number
  created_by?: InbodyCreatedBy
}

function toNumber(value: unknown): number {
  return Number(value)
}

function normalize(row: InbodyRecord): InbodyRecord {
  return {
    ...row,
    weight_kg: toNumber(row.weight_kg),
    skeletal_muscle_kg: toNumber(row.skeletal_muscle_kg),
    body_fat_kg: toNumber(row.body_fat_kg),
  }
}

export async function fetchInbodyRecords(
  memberId: string,
): Promise<InbodyRecord[]> {
  const centerId = await resolveCenterIdForMember(memberId)
  const { data, error } = await supabase
    .from('member_inbody_records')
    .select('*')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .order('measured_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => normalize(row as InbodyRecord))
}

export async function createInbodyRecord(
  memberId: string,
  input: InbodyInput,
): Promise<InbodyRecord> {
  const centerId = await resolveCenterIdForMember(memberId)
  const { data, error } = await supabase
    .from('member_inbody_records')
    .insert({
      center_id: centerId,
      member_id: memberId,
      measured_at: input.measured_at,
      weight_kg: input.weight_kg,
      skeletal_muscle_kg: input.skeletal_muscle_kg,
      body_fat_kg: input.body_fat_kg,
      created_by: input.created_by ?? 'member',
    })
    .select('*')
    .single()

  if (error) throw error
  return normalize(data as InbodyRecord)
}

export async function deleteInbodyRecord(
  recordId: string,
  memberId: string,
): Promise<void> {
  const centerId = await resolveCenterIdForMember(memberId)
  const { error } = await supabase
    .from('member_inbody_records')
    .delete()
    .eq('id', recordId)
    .eq('member_id', memberId)
    .eq('center_id', centerId)

  if (error) throw error
}
