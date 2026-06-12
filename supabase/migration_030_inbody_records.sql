-- 인바디 기록 (체중·골격근량·체지방량)
create table if not exists public.member_inbody_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(6, 1) not null check (weight_kg > 0),
  skeletal_muscle_kg numeric(6, 1) not null check (skeletal_muscle_kg > 0),
  body_fat_kg numeric(6, 1) not null check (body_fat_kg > 0),
  created_by text not null default 'member'
    check (created_by in ('member', 'trainer', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists member_inbody_records_member_id_idx
  on public.member_inbody_records (member_id);

create index if not exists member_inbody_records_measured_at_idx
  on public.member_inbody_records (measured_at desc);

alter table public.member_inbody_records enable row level security;

drop policy if exists "member_inbody_records_all" on public.member_inbody_records;
create policy "member_inbody_records_all" on public.member_inbody_records
  for all using (true) with check (true);
