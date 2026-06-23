import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import {
  normalizeTemplateKey,
  SEND_NOTIFICATION_CENTER_KEYS,
  SEND_NOTIFICATION_EVENT_KEYS,
  SEND_NOTIFICATION_MANUAL_KEYS,
  SEND_NOTIFICATION_MEMBER_KEYS,
} from '../_shared/alimtalkTemplateRegistry.ts'
import { isNotificationAuthorized } from '../_shared/notificationAuth.ts'
import {
  sendCenterNotification,
  sendMemberNotification,
} from '../_shared/notifications.ts'

const ALLOWED_KEYS = new Set([
  ...SEND_NOTIFICATION_MEMBER_KEYS,
  ...SEND_NOTIFICATION_CENTER_KEYS,
  ...SEND_NOTIFICATION_EVENT_KEYS,
  ...SEND_NOTIFICATION_MANUAL_KEYS,
])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!isNotificationAuthorized(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let body: {
    templateKey?: string
    memberId?: string
    centerId?: string
    paymentId?: string
    metadata?: Record<string, string | number>
  }

  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const templateKey = normalizeTemplateKey(body.templateKey ?? '')
  if (!templateKey || !ALLOWED_KEYS.has(templateKey)) {
    return jsonResponse({ error: 'Invalid templateKey' }, 400)
  }

  if (SEND_NOTIFICATION_CENTER_KEYS.has(templateKey)) {
    if (!body.centerId) {
      return jsonResponse({ error: 'centerId is required' }, 400)
    }
    const result = await sendCenterNotification({
      templateKey,
      centerId: body.centerId,
      metadata: body.metadata,
    })
    return jsonResponse(result, 200)
  }

  if (!body.memberId) {
    return jsonResponse({ error: 'memberId is required' }, 400)
  }

  const result = await sendMemberNotification({
    templateKey,
    memberId: body.memberId,
    paymentId: body.paymentId,
    metadata: body.metadata,
  })

  return jsonResponse(result, 200)
})
