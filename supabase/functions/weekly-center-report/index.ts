import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isNotificationAuthorized } from '../_shared/notificationAuth.ts'
import { sendCenterNotification } from '../_shared/notifications.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

function reportWeekLabelKst(): string {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
    })
  return `${fmt(start)} ~ ${fmt(now)}`
}

function weekStartKst(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!(await isNotificationAuthorized(req))) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = getSupabaseAdmin()
  const weekStart = weekStartKst()
  const reportWeek = reportWeekLabelKst()

  const { data: centers, error } = await supabase
    .from('centers')
    .select('id, name, slug')
    .eq('status', 'active')

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  const results: Array<{
    centerId: string
    status: string
    error?: string
  }> = []

  for (const center of centers ?? []) {
    const { count: activeMembers } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', center.id)
      .eq('status', 'active')

    const { count: newMembers } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', center.id)
      .gte('created_at', `${weekStart}T00:00:00+09:00`)

    const result = await sendCenterNotification({
      templateKey: 'weekly_report',
      centerId: center.id,
      metadata: {
        report_week: reportWeek,
        active_members: activeMembers ?? 0,
        new_members: newMembers ?? 0,
      },
    })

    results.push({
      centerId: center.id,
      status: result.status,
      error: result.error ?? result.skippedReason,
    })
  }

  return jsonResponse({
    ok: true,
    reportWeek,
    processed: results.length,
    results,
  })
})
