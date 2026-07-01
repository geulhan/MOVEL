-- BlogBrain Sprint 4: Pattern Intelligence Engine
-- pattern_versions, pattern_items, pattern_version_diffs

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.pattern_version_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null;
end $$;

alter type public.brain_activity_type add value if not exists 'pattern_version_created';
alter type public.brain_activity_type add value if not exists 'pattern_agent_completed';

-- ---------------------------------------------------------------------------
-- pattern_versions
-- ---------------------------------------------------------------------------

create table if not exists public.pattern_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version_label text not null,
  version_number numeric(4, 1) not null,
  status public.pattern_version_status not null default 'active',
  summary text,
  learning_count_at_create integer not null default 0 check (learning_count_at_create >= 0),
  agent_run_id uuid references public.agent_runs (id) on delete set null,
  raw_result jsonb,
  confidence numeric(4, 3),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  unique (project_id, version_label)
);

create index if not exists pattern_versions_project_id_idx
  on public.pattern_versions (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- pattern_items
-- ---------------------------------------------------------------------------

create table if not exists public.pattern_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  pattern_version_id uuid not null references public.pattern_versions (id) on delete cascade,
  category text not null,
  label text not null,
  description text,
  formula text,
  examples jsonb not null default '[]'::jsonb,
  confidence numeric(4, 3),
  occurrence_count integer not null default 1 check (occurrence_count >= 0),
  source_candidate_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pattern_version_id, category, label)
);

create index if not exists pattern_items_version_id_idx
  on public.pattern_items (pattern_version_id, category);
create index if not exists pattern_items_project_id_idx
  on public.pattern_items (project_id);

create trigger pattern_items_set_updated_at
before update on public.pattern_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- pattern_version_diffs
-- ---------------------------------------------------------------------------

create table if not exists public.pattern_version_diffs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  from_version_id uuid not null references public.pattern_versions (id) on delete cascade,
  to_version_id uuid not null references public.pattern_versions (id) on delete cascade,
  added_patterns jsonb not null default '[]'::jsonb,
  strengthened_patterns jsonb not null default '[]'::jsonb,
  weakened_patterns jsonb not null default '[]'::jsonb,
  removed_patterns jsonb not null default '[]'::jsonb,
  summary text,
  created_at timestamptz not null default now(),
  unique (from_version_id, to_version_id)
);

create index if not exists pattern_version_diffs_project_id_idx
  on public.pattern_version_diffs (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- project_brains: active pattern version
-- ---------------------------------------------------------------------------

alter table public.project_brains
  add column if not exists current_pattern_version_id uuid
    references public.pattern_versions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Brain recompute: pattern_items count (official patterns)
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
  v_version_label text;
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
  from public.pattern_items pi
  join public.project_brains pb on pb.current_pattern_version_id = pi.pattern_version_id
  where pb.project_id = p_project_id;

  if v_pattern_count is null then
    v_pattern_count := 0;
  end if;

  select max(analyzed_at) into v_last_learning_at
  from public.learning_articles
  where project_id = p_project_id and analysis_status = 'completed';

  select pv.version_label into v_version_label
  from public.project_brains pb
  left join public.pattern_versions pv on pv.id = pb.current_pattern_version_id
  where pb.project_id = p_project_id;

  v_brain_score := least(
    100,
    round(
      (v_learning_count * 2)
      + (v_knowledge_count * 1)
      + (v_relationship_count * 1)
      + (v_source_count * 0.5)
      + (v_pattern_count * 0.25)
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
    current_version_label = coalesce(v_version_label, current_version_label),
    last_learning_at = v_last_learning_at,
    last_computed_at = now(),
    score_breakdown = jsonb_build_object(
      'learning', v_learning_count,
      'knowledge', v_knowledge_count,
      'relationships', v_relationship_count,
      'sources', v_source_count,
      'patterns', v_pattern_count,
      'formula', 'learning*2 + knowledge*1 + relationships*1 + sources*0.5 + patterns*0.25'
    ),
    updated_at = now()
  where project_id = p_project_id;
end;
$$;

create or replace function public.trigger_recompute_from_patterns()
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

drop trigger if exists pattern_items_brain_sync on public.pattern_items;
create trigger pattern_items_brain_sync
after insert or update or delete on public.pattern_items
for each row execute function public.trigger_recompute_from_patterns();

drop trigger if exists pattern_versions_brain_sync on public.pattern_versions;
create trigger pattern_versions_brain_sync
after insert or update on public.pattern_versions
for each row execute function public.trigger_recompute_from_patterns();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.pattern_versions enable row level security;
alter table public.pattern_items enable row level security;
alter table public.pattern_version_diffs enable row level security;

drop policy if exists "pattern_versions_select" on public.pattern_versions;
create policy "pattern_versions_select"
  on public.pattern_versions for select
  using (public.is_project_member(project_id));

drop policy if exists "pattern_versions_insert" on public.pattern_versions;
create policy "pattern_versions_insert"
  on public.pattern_versions for insert
  with check (public.is_project_editor(project_id));

drop policy if exists "pattern_versions_update" on public.pattern_versions;
create policy "pattern_versions_update"
  on public.pattern_versions for update
  using (public.is_project_editor(project_id))
  with check (public.is_project_editor(project_id));

drop policy if exists "pattern_items_select" on public.pattern_items;
create policy "pattern_items_select"
  on public.pattern_items for select
  using (public.is_project_member(project_id));

drop policy if exists "pattern_items_insert" on public.pattern_items;
create policy "pattern_items_insert"
  on public.pattern_items for insert
  with check (public.is_project_editor(project_id));

drop policy if exists "pattern_version_diffs_select" on public.pattern_version_diffs;
create policy "pattern_version_diffs_select"
  on public.pattern_version_diffs for select
  using (public.is_project_member(project_id));

drop policy if exists "pattern_version_diffs_insert" on public.pattern_version_diffs;
create policy "pattern_version_diffs_insert"
  on public.pattern_version_diffs for insert
  with check (public.is_project_editor(project_id));
