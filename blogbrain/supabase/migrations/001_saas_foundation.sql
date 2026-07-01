-- BlogBrain Sprint 1: SaaS Foundation Layer
-- profiles, workspaces, workspace_members, projects, project_brains + RLS

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  preferences jsonb not null default '{"theme":"system"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_slug_idx on public.workspaces (slug);

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------------

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor', 'viewer')),
  invited_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  color text not null default '#6366f1',
  niche text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create index if not exists projects_workspace_id_idx on public.projects (workspace_id);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_brains
-- ---------------------------------------------------------------------------

create table if not exists public.project_brains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  brain_score numeric(5, 2) not null default 0 check (brain_score >= 0 and brain_score <= 100),
  current_version_label text not null default '1.0',
  learning_count integer not null default 0 check (learning_count >= 0),
  knowledge_count integer not null default 0 check (knowledge_count >= 0),
  pattern_count integer not null default 0 check (pattern_count >= 0),
  last_learning_at timestamptz,
  score_breakdown jsonb not null default '{}'::jsonb,
  last_computed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_brains_project_id_idx on public.project_brains (project_id);

create trigger project_brains_set_updated_at
before update on public.project_brains
for each row execute function public.set_updated_at();

create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_brains (project_id)
  values (new.id)
  on conflict (project_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
after insert on public.projects
for each row execute function public.handle_new_project();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_brains enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- workspaces
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select
  using (public.is_workspace_member(id));

drop policy if exists "workspaces_insert_authenticated" on public.workspaces;
create policy "workspaces_insert_authenticated"
  on public.workspaces for insert
  with check (auth.uid() is not null);

drop policy if exists "workspaces_update_owner" on public.workspaces;
create policy "workspaces_update_owner"
  on public.workspaces for update
  using (public.is_workspace_owner(id))
  with check (public.is_workspace_owner(id));

drop policy if exists "workspaces_delete_owner" on public.workspaces;
create policy "workspaces_delete_owner"
  on public.workspaces for delete
  using (public.is_workspace_owner(id));

-- workspace_members
drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_members_insert_self_or_owner" on public.workspace_members;
create policy "workspace_members_insert_self_or_owner"
  on public.workspace_members for insert
  with check (
    user_id = auth.uid()
    or public.is_workspace_owner(workspace_id)
  );

drop policy if exists "workspace_members_update_owner" on public.workspace_members;
create policy "workspace_members_update_owner"
  on public.workspace_members for update
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "workspace_members_delete_owner_or_self" on public.workspace_members;
create policy "workspace_members_delete_owner_or_self"
  on public.workspace_members for delete
  using (
    public.is_workspace_owner(workspace_id)
    or user_id = auth.uid()
  );

-- projects
drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member"
  on public.projects for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "projects_insert_editor" on public.projects;
create policy "projects_insert_editor"
  on public.projects for insert
  with check (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "projects_update_editor" on public.projects;
create policy "projects_update_editor"
  on public.projects for update
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "projects_delete_owner_admin" on public.projects;
create policy "projects_delete_owner_admin"
  on public.projects for delete
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

-- project_brains
drop policy if exists "project_brains_select_member" on public.project_brains;
create policy "project_brains_select_member"
  on public.project_brains for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_brains.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

drop policy if exists "project_brains_update_editor" on public.project_brains;
create policy "project_brains_update_editor"
  on public.project_brains for update
  using (
    exists (
      select 1
      from public.projects p
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = project_brains.project_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = project_brains.project_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'editor')
    )
  );
