-- BlogBrain Sprint 3: AI Agent Foundation
-- agent_runs, learning_analyses, pattern_candidates
-- learning_articles analysis status

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.analysis_status as enum (
    'pending', 'processing', 'completed', 'failed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.agent_run_status as enum (
    'queued', 'running', 'completed', 'failed'
  );
exception when duplicate_object then null;
end $$;

-- brain_activity_type extensions
alter type public.brain_activity_type add value if not exists 'learning_analyzed';
alter type public.brain_activity_type add value if not exists 'pattern_discovered';
alter type public.brain_activity_type add value if not exists 'agent_run_failed';

-- ---------------------------------------------------------------------------
-- learning_articles: analysis fields
-- ---------------------------------------------------------------------------

alter table public.learning_articles
  add column if not exists analysis_status public.analysis_status not null default 'pending',
  add column if not exists analysis_error text,
  add column if not exists analyzed_at timestamptz;

create index if not exists learning_articles_analysis_status_idx
  on public.learning_articles (project_id, analysis_status);

-- ---------------------------------------------------------------------------
-- agent_runs
-- ---------------------------------------------------------------------------

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  agent_name text not null,
  status public.agent_run_status not null default 'queued',
  input_ref jsonb not null default '{}'::jsonb,
  output_ref jsonb not null default '{}'::jsonb,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider text,
  model text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_project_id_idx
  on public.agent_runs (project_id, created_at desc);
create index if not exists agent_runs_status_idx
  on public.agent_runs (project_id, status);

-- ---------------------------------------------------------------------------
-- learning_analyses
-- ---------------------------------------------------------------------------

create table if not exists public.learning_analyses (
  id uuid primary key default gen_random_uuid(),
  learning_article_id uuid not null unique references public.learning_articles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  agent_run_id uuid references public.agent_runs (id) on delete set null,
  agent_name text not null default 'learning_agent',
  provider text not null,
  model text not null,
  raw_result jsonb not null,
  confidence numeric(4, 3),
  prompt_version text not null default '1.0',
  created_at timestamptz not null default now()
);

create index if not exists learning_analyses_project_id_idx
  on public.learning_analyses (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- pattern_candidates
-- ---------------------------------------------------------------------------

create table if not exists public.pattern_candidates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  learning_article_id uuid not null references public.learning_articles (id) on delete cascade,
  learning_analysis_id uuid not null references public.learning_analyses (id) on delete cascade,
  category text not null,
  label text not null,
  value jsonb not null default '{}'::jsonb,
  confidence numeric(4, 3),
  created_at timestamptz not null default now()
);

create index if not exists pattern_candidates_project_id_idx
  on public.pattern_candidates (project_id, created_at desc);
create index if not exists pattern_candidates_category_idx
  on public.pattern_candidates (project_id, category);

-- ---------------------------------------------------------------------------
-- Brain recompute: include pattern_candidates count
-- ---------------------------------------------------------------------------

create or replace function public.recompute_project_brain(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learning_count integer;
  v_knowledge_count integer;
  v_source_count integer;
  v_relationship_count integer;
  v_pattern_count integer;
  v_brain_score numeric(5, 2);
  v_last_learning_at timestamptz;
begin
  select count(*) into v_learning_count
  from public.learning_articles where project_id = p_project_id;

  select count(*) into v_knowledge_count
  from public.knowledge_entities where project_id = p_project_id;

  select count(*) into v_source_count
  from public.project_sources where project_id = p_project_id;

  select count(*) into v_relationship_count
  from public.knowledge_relationships where project_id = p_project_id;

  select count(*) into v_pattern_count
  from public.pattern_candidates where project_id = p_project_id;

  select max(analyzed_at) into v_last_learning_at
  from public.learning_articles
  where project_id = p_project_id and analysis_status = 'completed';

  v_brain_score := least(
    100,
    round(
      (v_learning_count * 2)
      + (v_knowledge_count * 1)
      + (v_relationship_count * 1)
      + (v_source_count * 0.5)
    )
  );

  update public.project_brains
  set
    learning_count = v_learning_count,
    knowledge_count = v_knowledge_count,
    source_count = v_source_count,
    relationship_count = v_relationship_count,
    pattern_count = v_pattern_count,
    brain_score = v_brain_score,
    last_learning_at = v_last_learning_at,
    last_computed_at = now(),
    score_breakdown = jsonb_build_object(
      'learning', v_learning_count,
      'knowledge', v_knowledge_count,
      'relationships', v_relationship_count,
      'sources', v_source_count,
      'pattern_candidates', v_pattern_count,
      'formula', 'learning*2 + knowledge*1 + relationships*1 + sources*0.5'
    ),
    updated_at = now()
  where project_id = p_project_id;
end;
$$;

-- Trigger: pattern_candidates / learning_analyses update brain
create or replace function public.trigger_recompute_from_analysis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  if v_project_id is not null then
    perform public.recompute_project_brain(v_project_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists pattern_candidates_brain_sync on public.pattern_candidates;
create trigger pattern_candidates_brain_sync
after insert or delete on public.pattern_candidates
for each row execute function public.trigger_recompute_from_analysis();

drop trigger if exists learning_analyses_brain_sync on public.learning_analyses;
create trigger learning_analyses_brain_sync
after insert or delete on public.learning_analyses
for each row execute function public.trigger_recompute_from_analysis();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.agent_runs enable row level security;
alter table public.learning_analyses enable row level security;
alter table public.pattern_candidates enable row level security;

drop policy if exists "agent_runs_select" on public.agent_runs;
create policy "agent_runs_select"
  on public.agent_runs for select
  using (public.is_project_member(project_id));

drop policy if exists "agent_runs_insert" on public.agent_runs;
create policy "agent_runs_insert"
  on public.agent_runs for insert
  with check (public.is_project_editor(project_id));

drop policy if exists "agent_runs_update" on public.agent_runs;
create policy "agent_runs_update"
  on public.agent_runs for update
  using (public.is_project_editor(project_id))
  with check (public.is_project_editor(project_id));

drop policy if exists "learning_analyses_select" on public.learning_analyses;
create policy "learning_analyses_select"
  on public.learning_analyses for select
  using (public.is_project_member(project_id));

drop policy if exists "learning_analyses_insert" on public.learning_analyses;
create policy "learning_analyses_insert"
  on public.learning_analyses for insert
  with check (public.is_project_editor(project_id));

drop policy if exists "pattern_candidates_select" on public.pattern_candidates;
create policy "pattern_candidates_select"
  on public.pattern_candidates for select
  using (public.is_project_member(project_id));

drop policy if exists "pattern_candidates_insert" on public.pattern_candidates;
create policy "pattern_candidates_insert"
  on public.pattern_candidates for insert
  with check (public.is_project_editor(project_id));
