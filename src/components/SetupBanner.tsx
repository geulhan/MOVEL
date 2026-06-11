import { isSupabaseConfigured } from '../lib/supabase'

export function SetupBanner() {
  const supabaseMissing = !isSupabaseConfigured
  const notifyKeyMissing = !import.meta.env.VITE_NOTIFICATION_TRIGGER_KEY

  if (!supabaseMissing && !notifyKeyMissing) return null

  return (
    <div className="mb-6 space-y-3">
      {supabaseMissing && (
        <div
          role="alert"
          className="rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm text-charcoal"
        >
          <p className="font-semibold text-gold-dark">
            Supabase 연결이 필요합니다
          </p>
          <p className="mt-1 text-muted">
            프로젝트 루트에 <code className="rounded bg-cream px-1">.env</code>{' '}
            파일을 만들고 README의 3단계를 따라주세요.
          </p>
        </div>
      )}
      {notifyKeyMissing && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-semibold">알림톡 연동 준비 중</p>
          <p className="mt-1">
            Vercel에 <code className="rounded bg-white px-1">VITE_NOTIFICATION_TRIGGER_KEY</code>
            를 설정하면 발송 이력이 기록됩니다. (솔라피 템플릿 승인 전에도
            skipped 로그로 동작 확인 가능)
          </p>
        </div>
      )}
    </div>
  )
}
