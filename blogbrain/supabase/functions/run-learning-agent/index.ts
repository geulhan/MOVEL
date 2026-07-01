import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseAdmin, createSupabaseUser } from '../_shared/supabaseAdmin.ts'
import { runLearningAgent } from '../_shared/ai/learningAgent.ts'
import { applyLearningPipeline } from '../_shared/ai/learningPipeline.ts'

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

    const { learningArticleId } = await req.json()
    if (!learningArticleId) {
      return new Response(JSON.stringify({ error: 'learningArticleId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createSupabaseUser(authHeader)
    const admin = createSupabaseAdmin()

    const { data: article, error: articleError } = await userClient
      .from('learning_articles')
      .select('id, project_id, title, body, source_url, memo, analysis_status')
      .eq('id', learningArticleId)
      .single()

    if (articleError || !article) {
      return new Response(JSON.stringify({ error: 'Learning article not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: agentRun, error: runError } = await admin
      .from('agent_runs')
      .insert({
        project_id: article.project_id,
        agent_name: 'learning_agent',
        status: 'running',
        input_ref: { learning_article_id: learningArticleId },
        started_at: new Date().toISOString(),
        provider: 'openai',
        model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      })
      .select('id')
      .single()

    if (runError) throw runError

    await admin
      .from('learning_articles')
      .update({ analysis_status: 'processing', analysis_error: null })
      .eq('id', learningArticleId)

    try {
      const { result, model } = await runLearningAgent({
        title: article.title,
        body: article.body,
        sourceUrl: article.source_url,
        memo: article.memo,
      })

      const { analysisId } = await applyLearningPipeline(
        admin,
        article,
        agentRun.id,
        result,
        'openai',
        model,
      )

      await admin
        .from('agent_runs')
        .update({
          status: 'completed',
          output_ref: { learning_analysis_id: analysisId },
          completed_at: new Date().toISOString(),
          attempt_count: 1,
        })
        .eq('id', agentRun.id)

      return new Response(
        JSON.stringify({
          success: true,
          agentRunId: agentRun.id,
          analysisId,
          confidence: result.confidence,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (agentError) {
      const message = agentError instanceof Error ? agentError.message : 'Agent failed'

      await admin
        .from('learning_articles')
        .update({ analysis_status: 'failed', analysis_error: message })
        .eq('id', learningArticleId)

      await admin
        .from('agent_runs')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', agentRun.id)

      await admin.from('brain_activity_logs').insert({
        project_id: article.project_id,
        activity_type: 'agent_run_failed',
        entity_id: agentRun.id,
        title: article.title,
        summary: message,
        metadata: { agent: 'learning_agent' },
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
