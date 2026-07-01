import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseAdmin, createSupabaseUser } from '../_shared/supabaseAdmin.ts'
import { runPatternAgent } from '../_shared/ai/patternAgent.ts'
import {
  applyPatternPipeline,
  gatherPatternContext,
} from '../_shared/ai/patternPipeline.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { projectId } = await req.json()
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createSupabaseUser(authHeader)
    const admin = createSupabaseAdmin()

    const { data: project, error: projectError } = await userClient
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const context = await gatherPatternContext(admin, projectId)

    if (context.candidates.length === 0 && context.analyses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No pattern candidates or learning analyses found. Run Learning Agent first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: agentRun, error: runError } = await admin
      .from('agent_runs')
      .insert({
        project_id: projectId,
        agent_name: 'pattern_agent',
        status: 'running',
        input_ref: {
          candidate_count: context.candidates.length,
          analysis_count: context.analyses.length,
        },
        started_at: new Date().toISOString(),
        provider: 'openai',
        model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      })
      .select('id')
      .single()

    if (runError) throw runError

    try {
      const { result, model } = await runPatternAgent({
        projectId,
        learningCount: context.learningCount,
        candidates: context.candidates,
        analyses: context.analyses,
        existingPatterns: context.existingPatterns,
      })

      const pipelineResult = await applyPatternPipeline(
        admin,
        projectId,
        agentRun.id,
        result,
        'openai',
        model,
      )

      await admin
        .from('agent_runs')
        .update({
          status: 'completed',
          output_ref: {
            pattern_version_id: pipelineResult.versionId,
            item_count: pipelineResult.itemCount,
          },
          completed_at: new Date().toISOString(),
          attempt_count: 1,
        })
        .eq('id', agentRun.id)

      return new Response(
        JSON.stringify({
          success: true,
          agentRunId: agentRun.id,
          versionId: pipelineResult.versionId,
          versionLabel: pipelineResult.versionLabel,
          itemCount: pipelineResult.itemCount,
          confidence: result.confidence,
          summary: result.summary,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (agentError) {
      const message = agentError instanceof Error ? agentError.message : 'Pattern Agent failed'

      await admin
        .from('agent_runs')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', agentRun.id)

      await admin.from('brain_activity_logs').insert({
        project_id: projectId,
        activity_type: 'agent_run_failed',
        entity_id: agentRun.id,
        title: 'Pattern Agent failed',
        summary: message,
        metadata: { agent: 'pattern_agent' },
      })

      throw agentError
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
