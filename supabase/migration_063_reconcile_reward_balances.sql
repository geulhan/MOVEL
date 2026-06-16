-- MILE/SCORE 잔액을 거래 원장 합계와 맞추고, 누락된 mile lot을 복구합니다.

-- 1) reward_balances 백필
update public.reward_balances rb
set
  move_score = coalesce(ledger.move_score, 0),
  move_mile = coalesce(ledger.move_mile, 0),
  updated_at = now()
from (
  select
    member_id,
    coalesce(sum(amount) filter (where currency = 'move_score'), 0)::int as move_score,
    coalesce(sum(amount) filter (where currency = 'move_mile'), 0)::int as move_mile
  from public.reward_transactions
  group by member_id
) ledger
where rb.member_id = ledger.member_id
  and (
    rb.move_score is distinct from coalesce(ledger.move_score, 0)
    or rb.move_mile is distinct from coalesce(ledger.move_mile, 0)
  );

-- 2) 적립 거래인데 mile lot이 없는 건 복구
insert into public.reward_mile_lots (
  member_id,
  center_id,
  source_transaction_id,
  earned_amount,
  remaining_amount,
  expires_at
)
select
  rt.member_id,
  rt.center_id,
  rt.id,
  rt.amount,
  rt.amount,
  coalesce(rt.expires_at, rt.created_at + interval '12 months')
from public.reward_transactions rt
where rt.currency = 'move_mile'
  and rt.amount > 0
  and not exists (
    select 1
    from public.reward_mile_lots rml
    where rml.source_transaction_id = rt.id
  );

-- 3) balance_after 연속값 재계산 (표시용)
with ordered as (
  select
    id,
    member_id,
    currency,
    amount,
    sum(amount) over (
      partition by member_id, currency
      order by created_at, id
      rows between unbounded preceding and current row
    )::int as running_balance
  from public.reward_transactions
)
update public.reward_transactions rt
set balance_after = ordered.running_balance
from ordered
where rt.id = ordered.id
  and rt.balance_after is distinct from ordered.running_balance;
