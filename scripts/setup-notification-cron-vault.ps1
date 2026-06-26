# pg_cron 자동발송 Vault Secret 등록
# 사용법 (PowerShell):
#   $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."   # Dashboard → Settings → API → service_role
#   .\scripts\setup-notification-cron-vault.ps1
#
# 또는 NOTIFICATION_INTERNAL_SECRET 사용:
#   $env:NOTIFICATION_INTERNAL_SECRET = "your-secret"
#   .\scripts\setup-notification-cron-vault.ps1 -UseNotificationSecret

param(
  [switch]$UseNotificationSecret
)

$projectUrl = "https://dcoitajktdaqejnhrnij.supabase.co"

if ($UseNotificationSecret) {
  if (-not $env:NOTIFICATION_INTERNAL_SECRET) {
    Write-Error "NOTIFICATION_INTERNAL_SECRET 환경변수를 설정하세요."
    exit 1
  }
  $secretValue = $env:NOTIFICATION_INTERNAL_SECRET.Replace("'", "''")
  $sql = @"
select vault.create_secret('$projectUrl', 'notification_cron_project_url', 'MotionHub notification cron URL');
select vault.create_secret('$secretValue', 'notification_cron_internal_secret', 'NOTIFICATION_INTERNAL_SECRET for cron');
"@
} else {
  if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Error "SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요. (Supabase Dashboard → Settings → API)"
    exit 1
  }
  $secretValue = $env:SUPABASE_SERVICE_ROLE_KEY.Replace("'", "''")
  $sql = @"
select vault.create_secret('$projectUrl', 'notification_cron_project_url', 'MotionHub notification cron URL');
select vault.create_secret('$secretValue', 'notification_cron_service_role_key', 'Service role for notification cron');
"@
}

Write-Host "Vault secret 등록 중..."
supabase db query --linked $sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "테스트: invoke_notification_cron() 실행..."
supabase db query --linked "select public.invoke_notification_cron();"
Write-Host "완료. pg_cron job: motionhub-notification-automation-hourly (매시 정각)"
