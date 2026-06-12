-- 운동일지 사진 첨부
alter table public.exercise_journals
  add column if not exists image_urls text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-journal-photos',
  'exercise-journal-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

drop policy if exists exercise_journal_photos_storage_all on storage.objects;
create policy exercise_journal_photos_storage_all on storage.objects
  for all using (bucket_id = 'exercise-journal-photos')
  with check (bucket_id = 'exercise-journal-photos');
