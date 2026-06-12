import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { sendMemberNotification } from '../_shared/notifications.ts'
import type { TemplateKey } from '../_shared/templates.ts'

const TEMPLATE_KEYS = new Set<TemplateKey>([
  'welcome',
  'payment_done',
  'renewal',
  'step_verification_result',
  'pt_reminder',
])

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('NOTIFICATION_INTERNAL_SECRET')
  if (!secret) return false

  const headerKey = req.headers.get('x-mobel-notification-key')
  if (headerKey && headerKey === secret) return true

  const auth = req.headers.get('authorization') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRole && auth === `Bearer ${serviceRole}`) return true

  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let body: {
    templateKey?: string
    memberId?: string
    paymentId?: string
    metadata?: Record<string, string | number>
  }

  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const templateKey = body.templateKey as TemplateKey | undefined
  const memberId = body.memberId

  if (!templateKey || !TEMPLATE_KEYS.has(templateKey)) {
    return jsonResponse({ error: 'Invalid templateKey' }, 400)
  }
  if (!memberId) {
    return jsonResponse({ error: 'memberId is required' }, 400)
  }

  const result = await sendMemberNotification({
    templateKey,
    memberId,
    paymentId: body.paymentId,
    metadata: body.metadata,
  })

  // Always 200 so the client receives result.error (Solapi, config, etc.)
  return jsonResponse(result, 200)
})
