import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn(
    'Supabase 환경 변수가 없습니다. .env.example 을 참고해 .env 파일을 만드세요.',
  )
}

export const supabase = createClient<Database>(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-key',
)

export const isSupabaseConfigured = Boolean(url && anonKey)

/** Vercel 환경 변수가 가리키는 Supabase 프로젝트 (디버그·점검용) */
export function getSupabaseProjectRef(): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname
    return host.endsWith('.supabase.co') ? host.replace('.supabase.co', '') : host
  } catch {
    return null
  }
}
