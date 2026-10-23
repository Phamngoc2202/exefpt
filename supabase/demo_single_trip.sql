-- Run after payments.sql and trip_quota.sql in Supabase SQL Editor.
-- Demo purchases use receiver_va = 'DEMO' and never create SePay transactions.
-- One demo purchase per account: Single Trip (20,000 VND) or Plus (99,000 VND).

begin;

create unique index if not exists payment_orders_one_demo_purchase_per_user
  on public.payment_orders (user_id)
  where receiver_va = 'DEMO';

create or replace function public.grant_demo_purchase(
  p_user_id uuid,
  p_expected_email text,
  p_plan_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.app_users%rowtype;
  existing_order_id uuid;
  new_order_id uuid;
  payment_code text;
  amount_vnd integer;
  generation_credits integer;
begin
  if p_plan_key = 'single_trip' then
    amount_vnd := 20000;
    generation_credits := 1;
  elsif p_plan_key = 'plus' then
    amount_vnd := 99000;
    generation_credits := 20;
  else
    raise exception 'invalid_demo_plan';
  end if;

  select * into account
  from public.app_users
  where id = p_user_id
  for update;

  if not found or account.role <> 'user'
     or lower(account.email) is distinct from lower(p_expected_email) then
    raise exception 'demo_account_mismatch';
  end if;

  select id into existing_order_id
  from public.payment_orders
  where user_id = p_user_id and receiver_va = 'DEMO' and plan_key = p_plan_key;

  if existing_order_id is not null then
    return existing_order_id;
  end if;

  if exists (
    select 1 from public.payment_orders
    where user_id = p_user_id and receiver_va = 'DEMO'
  ) then
    raise exception 'account_already_has_demo_purchase';
  end if;

  if exists (
    select 1 from public.payment_orders
    where user_id = p_user_id and status = 'paid' and receiver_va <> 'DEMO'
  ) then
    raise exception 'account_already_purchased';
  end if;

  payment_code := 'TG' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.payment_orders
    (user_id, plan_key, amount_vnd, credits, code, receiver_va, status, paid_at)
  values
    (p_user_id, p_plan_key, amount_vnd, generation_credits, payment_code, 'DEMO', 'paid', now())
  returning id into new_order_id;

  update public.app_users
  set bonus_generations = bonus_generations + generation_credits
  where id = p_user_id;

  return new_order_id;
end;
$$;

revoke all on function public.grant_demo_purchase(uuid, text, text) from public, anon, authenticated;
grant execute on function public.grant_demo_purchase(uuid, text, text) to service_role;

commit;
