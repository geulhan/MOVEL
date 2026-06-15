import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { formatSupabaseError } from '../lib/errors'

export type CenterType = 'pt' | 'pilates' | 'freelance' | 'other'

export type BetaApplicationInput = {
  centerName: string
  contactName: string
  phone: string
  email?: string
  centerType: CenterType
  message?: string
}

const BETA_TABLE_SETUP_HINT =
  '베타 신청 저장 설정이 필요합니다. Supabase SQL Editor에서 migration_038_beta_applications.sql을 실행해 주세요.'

export async function submitBetaApplication(
  input: BetaApplicationInput,
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error(
      '서비스 연결 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.',
    )
  }

  const { error } = await supabase.from('beta_applications').insert({
    center_name: input.centerName.trim(),
    contact_name: input.contactName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    center_type: input.centerType,
    message: input.message?.trim() || null,
  })

  if (error) {
    const msg = formatSupabaseError(error)
    if (
      error.code === '42P01' ||
      msg.includes('beta_applications') ||
      msg.includes('schema cache')
    ) {
      throw new Error(BETA_TABLE_SETUP_HINT)
    }
    throw new Error(msg)
  }
}
