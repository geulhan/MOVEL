import { supabase } from '../lib/supabase'

export type MemberConsultation = {
  id: string
  member_id: string
  consulted_at: string
  trainer_id: string | null
  trainer_name: string | null
  pain_status: string
  exercise_progress: string
  goals: string
  special_notes: string
  created_at: string
  updated_at: string
}

export type ConsultationInput = {
  consulted_at: string
  trainer_id?: string | null
  trainer_name?: string | null
  pain_status: string
  exercise_progress: string
  goals: string
  special_notes: string
}

export async function fetchMemberConsultations(
  memberId: string,
): Promise<MemberConsultation[]> {
  const { data, error } = await supabase
    .from('member_consultations')
    .select('*')
    .eq('member_id', memberId)
    .order('consulted_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MemberConsultation[]
}

export async function createMemberConsultation(
  memberId: string,
  input: ConsultationInput,
): Promise<MemberConsultation> {
  const payload = {
    member_id: memberId,
    consulted_at: input.consulted_at,
    trainer_id: input.trainer_id || null,
    trainer_name: input.trainer_name?.trim() || null,
    pain_status: input.pain_status.trim(),
    exercise_progress: input.exercise_progress.trim(),
    goals: input.goals.trim(),
    special_notes: input.special_notes.trim(),
  }

  const { data, error } = await supabase
    .from('member_consultations')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as MemberConsultation
}

export async function updateMemberConsultation(
  id: string,
  input: ConsultationInput,
): Promise<MemberConsultation> {
  const payload = {
    consulted_at: input.consulted_at,
    trainer_id: input.trainer_id || null,
    trainer_name: input.trainer_name?.trim() || null,
    pain_status: input.pain_status.trim(),
    exercise_progress: input.exercise_progress.trim(),
    goals: input.goals.trim(),
    special_notes: input.special_notes.trim(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('member_consultations')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as MemberConsultation
}

export async function deleteMemberConsultation(id: string): Promise<void> {
  const { error } = await supabase
    .from('member_consultations')
    .delete()
    .eq('id', id)

  if (error) throw error
}
