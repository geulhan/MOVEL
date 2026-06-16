-- 결제 카테고리: 필라테스·요가·GX·소그룹 PT 추가

alter table public.payment_requests
  drop constraint if exists payment_requests_category_check;

alter table public.payment_requests
  add constraint payment_requests_category_check
  check (
    category in (
      'pt',
      'center_pass',
      'locker_towel',
      'pilates',
      'yoga',
      'gx',
      'group_pt'
    )
  );

alter table public.payment_history
  drop constraint if exists payment_history_category_check;

alter table public.payment_history
  add constraint payment_history_category_check
  check (
    category in (
      'pt',
      'center_pass',
      'locker_towel',
      'pilates',
      'yoga',
      'gx',
      'group_pt'
    )
  );
