/**
 * Edge Function 알림 인증.
 * - Cron/서버: NOTIFICATION_INTERNAL_SECRET, NOTIFICATION_CRON_SECRET, SERVICE_ROLE
 * - 관리자 UI: x-session-token (center_user admin/trainer)
 */
export function isNotificationAuthorizedSync(req: Request): boolean {
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

type SessionVerifier = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>
}

export async function isNotificationAuthorized(
  req: Request,
  supabaseAdmin?: SessionVerifier,
): Promise<boolean> {
  if (isNotificationAuthorizedSync(req)) return true

  const sessionToken = req.headers.get('x-session-token')?.trim()
  if (!sessionToken || !supabaseAdmin) return false

  const { data, error } = await supabaseAdmin.rpc('verify_auth_session', {
    p_token: sessionToken,
    p_actor_type: 'center_user',
  })

  if (error || !Array.isArray(data) || data.length === 0) return false

  const role = (data[0] as { role?: string })?.role
  return role === 'admin' || role === 'trainer'
}
