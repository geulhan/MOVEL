import { supabase } from '../lib/supabase'
import type { MemberNote } from '../types/database'

export async function fetchMemberNotes(memberId: string): Promise<MemberNote[]> {
  const { data, error } = await supabase
    .from('member_notes')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MemberNote[]
}

export async function createMemberNote(
  memberId: string,
  content: string,
): Promise<MemberNote> {
  const { data, error } = await supabase
    .from('member_notes')
    .insert({ member_id: memberId, content: content.trim() })
    .select('*')
    .single()

  if (error) throw error
  return data as MemberNote
}

export async function updateMemberNote(
  noteId: string,
  content: string,
): Promise<MemberNote> {
  const { data, error } = await supabase
    .from('member_notes')
    .update({ content: content.trim() })
    .eq('id', noteId)
    .select('*')
    .single()

  if (error) throw error
  return data as MemberNote
}

export async function deleteMemberNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('member_notes')
    .delete()
    .eq('id', noteId)

  if (error) throw error
}
