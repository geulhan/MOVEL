-- BlogBrain Sprint 2: Source · Knowledge · Learning Layer
-- project_sources, knowledge_entities, knowledge_relationships,
-- learning_articles, learning_tags, brain_activity_logs

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_project_editor(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = p_project_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'editor')
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and public.is_workspace_member(p.workspace_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- project_sources
-- ---------------------------------------------------------------------------

create type public.source_type as enum (
  'news',
  'sns',
  'youtube',
  'brand',
  'magazine',
  'community',
  'custom'
);

create table if not exists public.project_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  url text,
  source_type public.source_type not null default 'custom',
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_sources_project_id_idx on public.project_sources (project_id);
create index if not exists project_sources_is_active_idx on public.project_sources (project_id, is_active);

create trigger project_sources_set_updated_at
before update on public.project_sources
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- knowledge_entities
-- ---------------------------------------------------------------------------

create type public.knowledge_entity_type as enum (
  'person',
  'brand',
  'keyword',
  'category',
  'product',
  'event'
);

create table if not exists public.knowledge_entities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  entity_type public.knowledge_entity_type not null,
  description text,
  memo text,
  tags text[] not null default '{}',
  importance smallint not null default 3 check (importance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, entity_type, name)
);

create index if not exists knowledge_entities_project_id_idx on public.knowledge_entities (project_id);
create index if not exists knowledge_entities_type_idx on public.knowledge_entities (project_id, entity_type);

create trigger knowledge_entities_set_updated_at
before update on public.knowledge_entities
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- knowledge_relationships
-- ---------------------------------------------------------------------------

create table if not exists public.knowledge_relationships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  from_entity_id uuid not null references public.knowledge_entities (id) on delete cascade,
  to_entity_id uuid not null references public.knowledge_entities (id) on delete cascade,
  relation_type text not null default 'related_to',
  memo text,
  created_at timestamptz not null default now(),
  check (from_entity_id <> to_entity_id),
  unique (from_entity_id, to_entity_id, relation_type)
);

create index if not exists knowledge_relationships_project_id_idx
  on public.knowledge_relationships (project_id);
create index if not exists knowledge_relationships_from_idx
  on public.knowledge_relationships (from_entity_id);
create index if not exists knowledge_relationships_to_idx
  on public.knowledge_relationships (to_entity_id);

-- ---------------------------------------------------------------------------
-- learning_articles
-- ---------------------------------------------------------------------------

create table if not exists public.learning_articles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  body text not null,
  source_url text,
  project_source_id uuid references public.project_sources (id) on delete set null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_articles_project_id_idx on public.learning_articles (project_id);
create index if not exists learning_articles_created_at_idx
  on public.learning_articles (project_id, created_at desc);

create trigger learning_articles_set_updated_at
before update on public.learning_articles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- learning_tags
-- ---------------------------------------------------------------------------

create table if not exists public.learning_tags (
  id uuid primary key default gen_random_uuid(),
  learning_article_id uuid not null references public.learning_articles (id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (learning_article_id, tag)
);

create index if not exists learning_tags_article_id_idx on public.learning_tags (learning_article_id);

-- ---------------------------------------------------------------------------
-- brain_activity_logs
-- ---------------------------------------------------------------------------

create type public.brain_activity_type as enum (
  'source_created',
  'source_updated',
  'source_deleted',
  'knowledge_created',
  'knowledge_updated',
  'knowledge_deleted',
  'relationship_created',
  'relationship_deleted',
  'learning_created',
  'learning_updated',
  'learning_deleted'
);

create table if not exists public.brain_activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  activity_type public.brain_activity_type not null,
  entity_id uuid,
  title text not null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists brain_activity_logs_project_id_idx
  on public.brain_activity_logs (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- project_brains: Sprint 2 counters
-- ---------------------------------------------------------------------------

alter table public.project_brains
  add column if not exists source_count integer not null default 0 check (source_count >= 0),
  add column if not exists relationship_count integer not null default 0 check (relationship_count >= 0);

-- ---------------------------------------------------------------------------
-- Brain score recompute
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
  v_brain_score numeric(5, 2);
  v_last_learning_at timestamptz;
begin
  select count(*) into v_learning_count
  from public.learning_articles
  where project_id = p_project_id;

  select count(*) into v_knowledge_count
  from public.knowledge_entities
  where project_id = p_project_id;

  select count(*) into v_source_count
  from public.project_sources
  where project_id = p_project_id;

  select count(*) into v_relationship_count
  from public.knowledge_relationships
  where project_id = p_project_id;

  select max(created_at) into v_last_learning_at
  from public.learning_articles
  where project_id = p_project_id;

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
    brain_score = v_brain_score,
    last_learning_at = v_last_learning_at,
    last_computed_at = now(),
    score_breakdown = jsonb_build_object(
      'learning', v_learning_count,
      'knowledge', v_knowledge_count,
      'relationships', v_relationship_count,
      'sources', v_source_count,
      'formula', 'learning*2 + knowledge*1 + relationships*1 + sources*0.5'
    ),
    updated_at = now()
  where project_id = p_project_id;
end;
$$;

create or replace function public.trigger_recompute_project_brain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);

  if tg_table_name = 'learning_tags' then
    select la.project_id into v_project_id
    from public.learning_articles la
    where la.id = coalesce(new.learning_article_id, old.learning_article_id);
  end if;

  if v_project_id is not null then
    perform public.recompute_project_brain(v_project_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.log_brain_activity(
  p_project_id uuid,
  p_activity_type public.brain_activity_type,
  p_entity_id uuid,
  p_title text,
  p_summary text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.brain_activity_logs (
    project_id,
    activity_type,
    entity_id,
    title,
    summary,
    metadata
  ) values (
    p_project_id,
    p_activity_type,
    p_entity_id,
    p_title,
    p_summary,
    p_metadata
  );
end;
$$;

-- Activity + recompute triggers
create or replace function public.handle_project_source_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_brain_activity(
      new.project_id, 'source_created', new.id, new.name,
      coalesce(new.source_type::text, 'custom')
    );
  elsif tg_op = 'UPDATE' then
    perform public.log_brain_activity(
      new.project_id, 'source_updated', new.id, new.name
    );
  elsif tg_op = 'DELETE' then
    perform public.log_brain_activity(
      old.project_id, 'source_deleted', old.id, old.name
    );
  end if;

  perform public.recompute_project_brain(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists project_sources_brain_sync on public.project_sources;
create trigger project_sources_brain_sync
after insert or update or delete on public.project_sources
for each row execute function public.handle_project_source_change();

create or replace function public.handle_knowledge_entity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_brain_activity(
      new.project_id, 'knowledge_created', new.id, new.name, new.entity_type::text
    );
  elsif tg_op = 'UPDATE' then
    perform public.log_brain_activity(
      new.project_id, 'knowledge_updated', new.id, new.name
    );
  elsif tg_op = 'DELETE' then
    perform public.log_brain_activity(
      old.project_id, 'knowledge_deleted', old.id, old.name
    );
  end if;

  perform public.recompute_project_brain(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists knowledge_entities_brain_sync on public.knowledge_entities;
create trigger knowledge_entities_brain_sync
after insert or update or delete on public.knowledge_entities
for each row execute function public.handle_knowledge_entity_change();

create or replace function public.handle_knowledge_relationship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if tg_op = 'INSERT' then
    select ke.name into v_title from public.knowledge_entities ke where ke.id = new.from_entity_id;
    perform public.log_brain_activity(
      new.project_id, 'relationship_created', new.id,
      coalesce(v_title, 'Relationship'), new.relation_type
    );
  elsif tg_op = 'DELETE' then
    perform public.log_brain_activity(
      old.project_id, 'relationship_deleted', old.id, 'Relationship removed'
    );
  end if;

  perform public.recompute_project_brain(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists knowledge_relationships_brain_sync on public.knowledge_relationships;
create trigger knowledge_relationships_brain_sync
after insert or delete on public.knowledge_relationships
for each row execute function public.handle_knowledge_relationship_change();

create or replace function public.handle_learning_article_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_brain_activity(
      new.project_id, 'learning_created', new.id, new.title
    );
  elsif tg_op = 'UPDATE' then
    perform public.log_brain_activity(
      new.project_id, 'learning_updated', new.id, new.title
    );
  elsif tg_op = 'DELETE' then
    perform public.log_brain_activity(
      old.project_id, 'learning_deleted', old.id, old.title
    );
  end if;

  perform public.recompute_project_brain(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists learning_articles_brain_sync on public.learning_articles;
create trigger learning_articles_brain_sync
after insert or update or delete on public.learning_articles
for each row execute function public.handle_learning_article_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.project_sources enable row level security;
alter table public.knowledge_entities enable row level security;
alter table public.knowledge_relationships enable row level security;
alter table public.learning_articles enable row level security;
alter table public.learning_tags enable row level security;
alter table public.brain_activity_logs enable row level security;

-- project_sources
drop policy if exists "project_sources_select" on public.project_sources;
create policy "project_sources_select"
  on public.project_sources for select
  using (public.is_project_member(project_id));

drop policy if exists "project_sources_insert" on public.project_sources;
create policy "project_sources_insert"
  on public.project_sources for insert
  with check (public.is_project_editor(project_id));

drop policy if exists "project_sources_update" on public.project_sources;
create policy "project_sources_update"
  on public.project_sources for update
  using (public.is_project_editor(project_id))
  with check (public.is_project_editor(project_id));

drop policy if exists "project_sources_delete" on public.project_sources;
create policy "project_sources_delete"
  on public.project_sources for delete
  using (public.is_project_editor(project_id));

-- knowledge_entities
drop policy if exists "knowledge_entities_select" on public.knowledge_entities;
create policy "knowledge_entities_select"
  on public.knowledge_entities for select
  using (public.is_project_member(project_id));

drop policy if exists "knowledge_entities_insert" on public.knowledge_entities;
create policy "knowledge_entities_insert"
  on public.knowledge_entities for insert
  with check (public.is_project_editor(project_id));

drop policy if exists "knowledge_entities_update" on public.knowledge_entities;
create policy "knowledge_entities_update"
  on public.knowledge_entities for update
  using (public.is_project_editor(project_id))
  with check (public.is_project_editor(project_id));

drop policy if exists "knowledge_entities_delete" on public.knowledge_entities;
create policy "knowledge_entities_delete"
  on public.knowledge_entities for delete
  using (public.is_project_editor(project_id));

-- knowledge_relationships
drop policy if exists "knowledge_relationships_select" on public.knowledge_relationships;
create policy "knowledge_relationships_select"
  on public.knowledge_relationships for select
  using (public.is_project_member(project_id));

drop policy if exists "knowledge_relationships_insert" on public.knowledge_relationships;
create policy "knowledge_relationships_insert"
  on public.knowledge_relationships for insert
  with check (public.is_project_editor(project_id));

drop policy if exists "knowledge_relationships_delete" on public.knowledge_relationships;
create policy "knowledge_relationships_delete"
  on public.knowledge_relationships for delete
  using (public.is_project_editor(project_id));

-- learning_articles
drop policy if exists "learning_articles_select" on public.learning_articles;
create policy "learning_articles_select"
  on public.learning_articles for select
  using (public.is_project_member(project_id));

drop policy if exists "learning_articles_insert" on public.learning_articles;
create policy "learning_articles_insert"
  on public.learning_articles for insert
  with check (public.is_project_editor(project_id));

drop policy if exists "learning_articles_update" on public.learning_articles;
create policy "learning_articles_update"
  on public.learning_articles for update
  using (public.is_project_editor(project_id))
  with check (public.is_project_editor(project_id));

drop policy if exists "learning_articles_delete" on public.learning_articles;
create policy "learning_articles_delete"
  on public.learning_articles for delete
  using (public.is_project_editor(project_id));

-- learning_tags
drop policy if exists "learning_tags_select" on public.learning_tags;
create policy "learning_tags_select"
  on public.learning_tags for select
  using (
    exists (
      select 1
      from public.learning_articles la
      where la.id = learning_tags.learning_article_id
        and public.is_project_member(la.project_id)
    )
  );

drop policy if exists "learning_tags_insert" on public.learning_tags;
create policy "learning_tags_insert"
  on public.learning_tags for insert
  with check (
    exists (
      select 1
      from public.learning_articles la
      where la.id = learning_tags.learning_article_id
        and public.is_project_editor(la.project_id)
    )
  );

drop policy if exists "learning_tags_delete" on public.learning_tags;
create policy "learning_tags_delete"
  on public.learning_tags for delete
  using (
    exists (
      select 1
      from public.learning_articles la
      where la.id = learning_tags.learning_article_id
        and public.is_project_editor(la.project_id)
    )
  );

-- brain_activity_logs
drop policy if exists "brain_activity_logs_select" on public.brain_activity_logs;
create policy "brain_activity_logs_select"
  on public.brain_activity_logs for select
  using (public.is_project_member(project_id));

drop policy if exists "brain_activity_logs_insert" on public.brain_activity_logs;
create policy "brain_activity_logs_insert"
  on public.brain_activity_logs for insert
  with check (public.is_project_editor(project_id));
