import { supabase } from '../lib/supabase'
import { awardExerciseJournal } from './rewards'

export type ExerciseJournal = {
  id: string
  member_id: string
  trained_at: string
  title: string | null
  content: string
  created_by: string
  created_at: string
}

export async function fetchExerciseJournals(
  memberId: string,
): Promise<ExerciseJournal[]> {
  const { data, error } = await supabase
    .from('exercise_journals')
    .select('*')
    .eq('member_id', memberId)
    .order('trained_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ExerciseJournal[]
}

export async function createExerciseJournal(
  memberId: string,
  input: { trained_at: string; title?: string; content: string },
): Promise<ExerciseJournal> {
  const { data, error } = await supabase
    .from('exercise_journals')
    .insert({
      member_id: memberId,
      trained_at: input.trained_at,
      title: input.title?.trim() || null,
      content: input.content.trim(),
      created_by: 'admin',
    })
    .select('*')
    .single()

  if (error) throw error
  const journal = data as ExerciseJournal
  try {
    await awardExerciseJournal(memberId, journal.id, journal.trained_at)
  } catch (rewardErr) {
    console.warn('운동일지 리워드 적립 실패:', rewardErr)
  }
  return journal
}

export async function updateExerciseJournal(
  journalId: string,
  input: { trained_at: string; title?: string; content: string },
): Promise<ExerciseJournal> {
  const { data, error } = await supabase
    .from('exercise_journals')
    .update({
      trained_at: input.trained_at,
      title: input.title?.trim() || null,
      content: input.content.trim(),
    })
    .eq('id', journalId)
    .select('*')
    .single()

  if (error) throw error
  return data as ExerciseJournal
}

export async function deleteExerciseJournal(journalId: string): Promise<void> {
  const { error } = await supabase
    .from('exercise_journals')
    .delete()
    .eq('id', journalId)

  if (error) throw error
}
