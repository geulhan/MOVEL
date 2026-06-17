import {
  CONSULTATION_CONTENT_FIELDS,
  emptyConsultationContentFields,
  type ConsultationContentFieldKey,
} from '../constants/consultationFields'
import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'

export type MemberConsultation = {
  id: string
  member_id: string
  consulted_at: string
  trainer_id: string | null
  trainer_name: string | null
  visit_purpose: string
  occupation_work_pattern: string
  sitting_activity_time: string
  current_discomfort: string
  injury_treatment_history: string
  sleep_diet: string
  exercise_experience: string
  posture_assessment: string
  movement_assessment: string
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
} & Record<ConsultationContentFieldKey, string>

function normalizeConsultationRow(
  row: Record<string, unknown>,
): MemberConsultation {
  const defaults = emptyConsultationContentFields()
  return {
    ...(row as MemberConsultation),
    visit_purpose: String(row.visit_purpose ?? defaults.visit_purpose),
    occupation_work_pattern: String(
      row.occupation_work_pattern ?? defaults.occupation_work_pattern,
    ),
    sitting_activity_time: String(
      row.sitting_activity_time ?? defaults.sitting_activity_time,
    ),
    current_discomfort: String(
      row.current_discomfort ?? defaults.current_discomfort,
    ),
    injury_treatment_history: String(
      row.injury_treatment_history ?? defaults.injury_treatment_history,
    ),
    sleep_diet: String(row.sleep_diet ?? defaults.sleep_diet),
    exercise_experience: String(
      row.exercise_experience ?? defaults.exercise_experience,
    ),
    posture_assessment: String(
      row.posture_assessment ?? defaults.posture_assessment,
    ),
    movement_assessment: String(
      row.movement_assessment ?? defaults.movement_assessment,
    ),
    pain_status: String(row.pain_status ?? ''),
    exercise_progress: String(row.exercise_progress ?? ''),
    goals: String(row.goals ?? ''),
    special_notes: String(row.special_notes ?? ''),
  }
}

function buildContentPayload(
  input: ConsultationInput,
): Record<ConsultationContentFieldKey, string> {
  const payload = {} as Record<ConsultationContentFieldKey, string>
  for (const field of CONSULTATION_CONTENT_FIELDS) {
    payload[field.key] = input[field.key].trim()
  }
  return payload
}

export async function fetchMemberConsultations(
  memberId: string,
): Promise<MemberConsultation[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('member_consultations')
    .select('*')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .order('consulted_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => normalizeConsultationRow(row))
}

export async function createMemberConsultation(
  memberId: string,
  input: ConsultationInput,
): Promise<MemberConsultation> {
  const centerId = await getCurrentCenterId()
  const payload = {
    center_id: centerId,
    member_id: memberId,
    consulted_at: input.consulted_at,
    trainer_id: input.trainer_id || null,
    trainer_name: input.trainer_name?.trim() || null,
    ...buildContentPayload(input),
    pain_status: '',
    exercise_progress: '',
    goals: '',
    special_notes: '',
  }

  const { data, error } = await supabase
    .from('member_consultations')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return normalizeConsultationRow(data)
}

export async function updateMemberConsultation(
  id: string,
  input: ConsultationInput,
): Promise<MemberConsultation> {
  const payload = {
    consulted_at: input.consulted_at,
    trainer_id: input.trainer_id || null,
    trainer_name: input.trainer_name?.trim() || null,
    ...buildContentPayload(input),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('member_consultations')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return normalizeConsultationRow(data)
}

export async function deleteMemberConsultation(id: string): Promise<void> {
  const { error } = await supabase
    .from('member_consultations')
    .delete()
    .eq('id', id)

  if (error) throw error
}
