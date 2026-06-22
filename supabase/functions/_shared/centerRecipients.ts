import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * 센터 관리자 수신 번호 조회
 * 1순위: center_users (role=center_admin, status=active, phone 있음)
 * 2순위: centers.contact_phone
 */
export async function resolveCenterAdminPhones(
  supabase: SupabaseClient,
  centerId: string,
): Promise<string[]> {
  const phones = new Set<string>()

  const { data: admins } = await supabase
    .from('center_users')
    .select('phone')
    .eq('center_id', centerId)
    .eq('role', 'center_admin')
    .eq('status', 'active')

  for (const admin of admins ?? []) {
    const digits = normalizePhone(String(admin.phone ?? ''))
    if (digits.length >= 10) phones.add(digits)
  }

  if (phones.size === 0) {
    const { data: center } = await supabase
      .from('centers')
      .select('contact_phone')
      .eq('id', centerId)
      .maybeSingle()

    const fallback = normalizePhone(String(center?.contact_phone ?? ''))
    if (fallback.length >= 10) phones.add(fallback)
  }

  return [...phones]
}
