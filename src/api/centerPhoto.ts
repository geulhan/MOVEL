import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { todayDateString } from './members'
import { awardCenterPhoto } from './rewards'

export type CenterPhotoStatus = 'pending' | 'approved' | 'rejected'

export type CenterPhotoSubmission = {
  id: string
  member_id: string
  submission_date: string
  image_url: string
  image_path: string | null
  status: CenterPhotoStatus
  rejection_reason: string | null
  mile_awarded: number
  reviewed_at: string | null
  created_at: string
}

export type CenterPhotoSubmissionWithMember = CenterPhotoSubmission & {
  member_name?: string | null
}

export async function hasApprovedCenterPhotoToday(
  memberId: string,
  date = todayDateString(),
): Promise<boolean> {
  const { data, error } = await supabase
    .from('center_photo_submissions')
    .select('id')
    .eq('member_id', memberId)
    .eq('submission_date', date)
    .eq('status', 'approved')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function hasPendingCenterPhotoToday(
  memberId: string,
  date = todayDateString(),
): Promise<boolean> {
  const { data, error } = await supabase
    .from('center_photo_submissions')
    .select('id')
    .eq('member_id', memberId)
    .eq('submission_date', date)
    .eq('status', 'pending')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function fetchTodayCenterPhotoSubmission(
  memberId: string,
): Promise<CenterPhotoSubmission | null> {
  const today = todayDateString()
  const { data, error } = await supabase
    .from('center_photo_submissions')
    .select('*')
    .eq('member_id', memberId)
    .eq('submission_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as CenterPhotoSubmission | null) ?? null
}

export async function submitCenterPhoto(
  memberId: string,
  file: File,
): Promise<CenterPhotoSubmission> {
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  if (!isImage) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('이미지는 10MB 이하만 가능합니다.')
  }

  const today = todayDateString()
  if (await hasApprovedCenterPhotoToday(memberId, today)) {
    throw new Error('오늘은 이미 센터 사진 인증이 완료되었습니다.')
  }
  if (await hasPendingCenterPhotoToday(memberId, today)) {
    throw new Error('오늘 제출한 센터 사진이 검수 대기 중입니다.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const imagePath = `${memberId}/${today}_${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('center-photos')
    .upload(imagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })

  if (uploadError) {
    throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from('center-photos')
    .getPublicUrl(imagePath)

  const centerId = await getCurrentCenterId(memberId)

  const { data, error } = await supabase
    .from('center_photo_submissions')
    .insert({
      member_id: memberId,
      center_id: centerId,
      submission_date: today,
      image_url: urlData.publicUrl,
      image_path: imagePath,
      status: 'pending',
      mile_awarded: 0,
      reviewed_at: null,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from('center-photos').remove([imagePath])
    if (error.code === '23505') {
      throw new Error('오늘은 이미 센터 사진 인증이 완료되었습니다.')
    }
    throw new Error(
      `센터 사진 제출 등록 실패: ${error.message}. 잠시 후 다시 시도해 주세요.`,
    )
  }

  return data as CenterPhotoSubmission
}

export async function approveCenterPhotoSubmission(
  submissionId: string,
): Promise<CenterPhotoSubmission> {
  const { data: existing, error: fetchError } = await supabase
    .from('center_photo_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (fetchError) throw fetchError
  const submission = existing as CenterPhotoSubmission

  if (submission.status === 'approved') {
    return submission
  }
  if (submission.status !== 'pending') {
    throw new Error('대기 중인 제출만 승인할 수 있습니다.')
  }

  if (await hasApprovedCenterPhotoToday(submission.member_id, submission.submission_date)) {
    throw new Error('해당 회원은 이미 오늘 센터 사진 인증이 완료되었습니다.')
  }

  const now = new Date().toISOString()
  const mileAwarded = await awardCenterPhoto(
    submission.member_id,
    submission.id,
    submission.submission_date,
  )

  const { data, error } = await supabase
    .from('center_photo_submissions')
    .update({
      status: 'approved',
      mile_awarded: mileAwarded,
      reviewed_at: now,
      rejection_reason: null,
    })
    .eq('id', submissionId)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (error) throw error
  return data as CenterPhotoSubmission
}

export async function rejectCenterPhotoSubmission(
  submissionId: string,
  reason: string,
): Promise<CenterPhotoSubmission> {
  const trimmed = reason.trim()
  if (!trimmed) {
    throw new Error('반려 사유를 입력해 주세요.')
  }

  const { data, error } = await supabase
    .from('center_photo_submissions')
    .update({
      status: 'rejected',
      rejection_reason: trimmed,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (error) throw error
  return data as CenterPhotoSubmission
}

export async function fetchCenterPhotoSubmissions(options?: {
  memberId?: string
  status?: CenterPhotoStatus
  limit?: number
}): Promise<CenterPhotoSubmissionWithMember[]> {
  const centerId = await getCurrentCenterId()

  if (options?.memberId) {
    let query = supabase
      .from('center_photo_submissions')
      .select('*')
      .eq('member_id', options.memberId)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 50)

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    const { data, error } = await query
    if (error) throw error
    const rows = (data ?? []) as CenterPhotoSubmission[]
    if (rows.length === 0) return []

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name')
      .eq('id', options.memberId)
      .maybeSingle()

    if (membersError) throw membersError
    const memberName = members?.name ?? null

    return rows.map((row) => ({
      ...row,
      member_name: memberName,
    }))
  }

  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name')
    .eq('center_id', centerId)

  if (membersError) throw membersError

  const memberRows = (members ?? []) as { id: string; name: string }[]
  const memberIds = memberRows.map((row) => row.id)
  if (memberIds.length === 0) return []

  let query = supabase
    .from('center_photo_submissions')
    .select('*')
    .in('member_id', memberIds)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as CenterPhotoSubmission[]
  if (rows.length === 0) return []

  const nameMap = new Map(memberRows.map((member) => [member.id, member.name]))

  return rows.map((row) => ({
    ...row,
    member_name: nameMap.get(row.member_id) ?? null,
  }))
}

export async function countPendingCenterPhotoSubmissions(): Promise<number> {
  const centerId = await getCurrentCenterId()
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id')
    .eq('center_id', centerId)

  if (membersError) throw membersError

  const memberIds = ((members ?? []) as { id: string }[]).map((row) => row.id)
  if (memberIds.length === 0) return 0

  const { count, error } = await supabase
    .from('center_photo_submissions')
    .select('id', { count: 'exact', head: true })
    .in('member_id', memberIds)
    .eq('status', 'pending')

  if (error) throw error
  return count ?? 0
}
