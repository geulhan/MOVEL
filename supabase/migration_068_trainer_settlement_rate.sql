-- 트레이너별 수업료 비율 (null = 센터 기본값)

alter table public.trainers
  add column if not exists settlement_rate smallint;

alter table public.trainers
  drop constraint if exists trainers_settlement_rate_check;

alter table public.trainers
  add constraint trainers_settlement_rate_check
  check (
    settlement_rate is null
    or (settlement_rate >= 0 and settlement_rate <= 100)
  );

comment on column public.trainers.settlement_rate is
  '트레이너별 수업료 비율(%). null이면 경영분석 기본 비율을 사용합니다.';
