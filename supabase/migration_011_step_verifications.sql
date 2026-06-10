-- 걸음수 OCR 자동 인증 시스템
-- Supabase SQL Editor에서 실행 (기존 데이터 삭제 없음)

-- 회원별 일일 인증코드 (예: MOVEL-8421)
create table if not exists public.step_verification_codes (
  member_id uuid not null references public.members (id) on delete cascade,
  code_date date not null,
  code text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, code_date)
);

-- 걸음수 인증 제출 + OCR 결과
create table if not exists public.step_verifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  verification_date date not null default current_date,
  image_url text not null,
  image_path text,
  expected_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  extracted_step_count integer,
  extracted_date date,
  extracted_time text,
  extracted_code text,
  ai_confidence numeric(5, 2),
  ocr_raw_text text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 같은 날 승인 1회만
create unique index if not exists step_verifications_member_date_approved_uidx
  on public.step_verifications (member_id, verification_date)
  where status = 'approved';

create index if not exists step_verifications_member_created_idx
  on public.step_verifications (member_id, created_at desc);

create index if not exists step_verifications_status_idx
  on public.step_verifications (status);

alter table public.step_verification_codes enable row level security;
alter table public.step_verifications enable row level security;

drop policy if exists "step_verification_codes_all" on public.step_verification_codes;
create policy "step_verification_codes_all" on public.step_verification_codes
  for all using (true) with check (true);

drop policy if exists "step_verifications_all" on public.step_verifications;
create policy "step_verifications_all" on public.step_verifications
  for all using (true) with check (true);

-- 캡처 이미지 저장소
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'step-verifications',
  'step-verifications',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

drop policy if exists "step_verifications_storage_all" on storage.objects;
create policy "step_verifications_storage_all" on storage.objects
  for all using (bucket_id = 'step-verifications')
  with check (bucket_id = 'step-verifications');
