import { isSupabaseConfigured } from '../lib/supabase'

export function SetupBanner() {
  const supabaseMissing = !isSupabaseConfigured

  if (!supabaseMissing) return null

  return (
    <div className="mb-6 space-y-3">
      <div
        role="alert"
        className="rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm text-charcoal"
      >
        <p className="font-semibold text-gold-dark">Supabase 연결이 필요합니다</p>
        <p className="mt-1 text-muted">
          프로젝트 루트에 <code className="rounded bg-cream px-1">.env</code> 파일을 만들고
          README의 3단계를 따라주세요.
        </p>
      </div>
    </div>
  )
}
