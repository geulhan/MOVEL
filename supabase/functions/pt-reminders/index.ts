import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isNotificationAuthorized } from '../_shared/notificationAuth.ts'
import { runPtReminders } from '../_shared/ptReminderRunner.ts'

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

  try {
    const result = await runPtReminders()
    return jsonResponse({ ok: true, ...result })
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    )
  }
})
