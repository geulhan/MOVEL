-- 스토리지에만 있고 DB 제출 기록이 없는 센터 사진 복구
-- (center_id 누락 등으로 insert 실패했던 업로드)

insert into public.center_photo_submissions (
  member_id,
  center_id,
  submission_date,
  image_url,
  image_path,
  status,
  mile_awarded,
  reviewed_at,
  created_at
)
select
  m.id,
  m.center_id,
  (regexp_match(o.name, '/(\d{4}-\d{2}-\d{2})_'))[1]::date,
  'https://dcoitajktdaqejnhrnij.supabase.co/storage/v1/object/public/center-photos/' || o.name,
  o.name,
  'pending',
  0,
  null,
  o.created_at
from storage.objects o
join public.members m on m.id::text = split_part(o.name, '/', 1)
where o.bucket_id = 'center-photos'
  and o.name ~ '^[0-9a-f-]{36}/\d{4}-\d{2}-\d{2}_'
  and not exists (
    select 1
    from public.center_photo_submissions cps
    where cps.image_path = o.name
  )
  and not exists (
    select 1
    from public.center_photo_submissions cps
    where cps.member_id = m.id
      and cps.submission_date = (regexp_match(o.name, '/(\d{4}-\d{2}-\d{2})_'))[1]::date
      and cps.status in ('pending', 'approved')
  );
