import { getCurrentCenterId, resolveCenterIdForMember } from '../lib/center'
import { supabase } from '../lib/supabase'
import { awardGrowthOnWorkoutLog } from './growth'
import { awardCustomRulesOnExerciseJournal } from './rewards'
import { logPlatformActivity } from './platformActivity'

export type ExerciseJournalCreatedBy = 'member' | 'trainer' | 'admin'

export type ExerciseJournal = {
  id: string
  member_id: string
  trained_at: string
  title: string | null
  content: string
  created_by: ExerciseJournalCreatedBy
  image_urls: string[]
  created_at: string
}

const BUCKET = 'exercise-journal-photos'
const MAX_PHOTOS = 5
const MAX_BYTES = 10 * 1024 * 1024

function normalize(row: ExerciseJournal): ExerciseJournal {
  return {
    ...row,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
  }
}

export async function uploadExerciseJournalPhotos(
  memberId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return []
  if (files.length > MAX_PHOTOS) {
    throw new Error(`사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`)
  }

  const urls: string[] = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      throw new Error('이미지 파일만 업로드할 수 있습니다.')
    }
    if (file.size > MAX_BYTES) {
      throw new Error('이미지는 10MB 이하만 가능합니다.')
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const imagePath = `${memberId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(imagePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(imagePath)

    urls.push(urlData.publicUrl)
  }

  return urls
}

export async function fetchExerciseJournals(
  memberId: string,
): Promise<ExerciseJournal[]> {
  const centerId = await resolveCenterIdForMember(memberId)
  const { data, error } = await supabase
    .from('exercise_journals')
    .select('*')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .order('trained_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => normalize(row as ExerciseJournal))
}

export function exerciseJournalLookupKey(memberId: string, trainedAt: string): string {
  return `${memberId}|${trainedAt}`
}

/** PT 일정과 운동일지 매칭용: member_id + trained_at(YYYY-MM-DD) */
export async function fetchExerciseJournalKeysInRange(
  startDate: string,
  endDate: string,
): Promise<Set<string>> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('exercise_journals')
    .select('member_id, trained_at')
    .eq('center_id', centerId)
    .gte('trained_at', startDate)
    .lte('trained_at', endDate)

  if (error) throw error

  const keys = new Set<string>()
  for (const row of data ?? []) {
    const trainedAt = String(row.trained_at).slice(0, 10)
    keys.add(exerciseJournalLookupKey(String(row.member_id), trainedAt))
  }
  return keys
}

export async function createExerciseJournal(
  memberId: string,
  input: {
    trained_at: string
    title?: string
    content: string
    created_by?: ExerciseJournalCreatedBy
    photoFiles?: File[]
  },
): Promise<ExerciseJournal> {
  const trimmed = input.content.trim()
  const photoFiles = input.photoFiles ?? []
  if (!trimmed && photoFiles.length === 0) {
    throw new Error('내용 또는 사진을 입력해 주세요.')
  }

  const image_urls = await uploadExerciseJournalPhotos(memberId, photoFiles)

  const centerId = await resolveCenterIdForMember(memberId)
  if (!centerId) {
    throw new Error('센터 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.')
  }

  const { data, error } = await supabase
    .from('exercise_journals')
    .insert({
      center_id: centerId,
      member_id: memberId,
      trained_at: input.trained_at,
      title: input.title?.trim() || null,
      content: trimmed || '(사진 첨부)',
      created_by: input.created_by ?? 'admin',
      image_urls,
    })
    .select('*')
    .single()

  if (error) throw error

  void logPlatformActivity('journal_created', {
    centerId,
    actorType:
      input.created_by === 'member'
        ? 'member'
        : input.created_by === 'trainer'
          ? 'trainer'
          : 'admin',
    metadata: { journal_id: data.id, member_id: memberId },
  })

  if (input.created_by === 'member') {
    void awardGrowthOnWorkoutLog(memberId, data.id)
  }

  try {
    await awardCustomRulesOnExerciseJournal(memberId, data.id)
  } catch (rewardErr) {
    console.warn('추가 적립 규칙 처리 실패:', rewardErr)
  }

  return normalize(data as ExerciseJournal)
}

export async function updateExerciseJournal(
  memberId: string,
  journalId: string,
  input: {
    trained_at: string
    title?: string
    content: string
    photoFiles?: File[]
    existingImageUrls?: string[]
  },
): Promise<ExerciseJournal> {
  const trimmed = input.content.trim()
  const kept = input.existingImageUrls ?? []
  const newUrls =
    input.photoFiles && input.photoFiles.length > 0
      ? await uploadExerciseJournalPhotos(memberId, input.photoFiles)
      : []

  if (!trimmed && kept.length + newUrls.length === 0) {
    throw new Error('내용 또는 사진을 입력해 주세요.')
  }

  const image_urls = [...kept, ...newUrls].slice(0, MAX_PHOTOS)

  const { data, error } = await supabase
    .from('exercise_journals')
    .update({
      trained_at: input.trained_at,
      title: input.title?.trim() || null,
      content: trimmed || '(사진 첨부)',
      image_urls,
    })
    .eq('id', journalId)
    .select('*')
    .single()

  if (error) throw error
  return normalize(data as ExerciseJournal)
}

export async function deleteExerciseJournal(journalId: string): Promise<void> {
  const { error } = await supabase
    .from('exercise_journals')
    .delete()
    .eq('id', journalId)

  if (error) throw error
}
