-- 회원 상담기록 (구조화)
-- Supabase SQL Editor에서 실행

create table if not exists public.member_consultations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  consulted_at date not null default current_date,
  trainer_id uuid references public.trainers (id) on delete set null,
  trainer_name text,
  pain_status text not null default '',
  exercise_progress text not null default '',
  goals text not null default '',
  special_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_consultations_member_id_idx
  on public.member_consultations (member_id);

create index if not exists member_consultations_consulted_at_idx
  on public.member_consultations (consulted_at desc);

alter table public.member_consultations enable row level security;

drop policy if exists "member_consultations_all" on public.member_consultations;
create policy "member_consultations_all" on public.member_consultations
  for all using (true) with check (true);
