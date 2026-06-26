export function isNotificationAuthorized(req: Request): boolean {
  const secret = Deno.env.get('NOTIFICATION_INTERNAL_SECRET')
  if (!secret) return false

  const headerKey = req.headers.get('x-mobel-notification-key')
  if (headerKey && headerKey === secret) return true

  const cronSecret = Deno.env.get('NOTIFICATION_CRON_SECRET')
  const cronHeader = req.headers.get('x-notification-cron-key')
  if (cronSecret && cronHeader && cronHeader === cronSecret) return true

  const auth = req.headers.get('authorization') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRole && auth === `Bearer ${serviceRole}`) return true

  return false
}
