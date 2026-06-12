-- 기간 이용 결제 요청의 이용 시작일
alter table public.payment_requests
  add column if not exists starts_at date;
