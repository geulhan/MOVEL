-- 회원 상담 기록 (통증·상담·특이사항)
-- Supabase SQL Editor에서 실행

create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists member_notes_member_id_idx on public.member_notes (member_id);
create index if not exists member_notes_created_at_idx on public.member_notes (created_at desc);

alter table public.member_notes enable row level security;

drop policy if exists "member_notes_all" on public.member_notes;
create policy "member_notes_all" on public.member_notes
  for all using (true) with check (true);
