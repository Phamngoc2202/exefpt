-- Run after admin.sql and trip_quota.sql in Supabase SQL Editor.
-- Payment order creation is server-only. Only the authenticated owner can read an order.

begin;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null check (plan_key in ('single_trip', 'plus', 'team')),
  amount_vnd integer not null,
  credits integer not null,
  code text not null unique check (code ~ '^TG[0-9A-F]{10}$'),
  receiver_va text not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  sepay_transaction_id bigint unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  paid_at timestamptz,
  constraint payment_plan_amount_check check (
    (plan_key = 'single_trip' and amount_vnd = 20000 and credits = 1) or
    (plan_key = 'plus' and amount_vnd = 99000 and credits = 20) or
    (plan_key = 'team' and amount_vnd = 349000 and credits = 50)
  )
);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);

create table if not exists public.payment_transactions (
  sepay_transaction_id bigint primary key,
  order_id uuid not null unique references public.payment_orders(id),
  amount_vnd integer not null,
  receiver_va text not null,
  content text,
  received_at timestamptz not null default now()
);

alter table public.payment_orders enable row level security;
alter table public.payment_transactions enable row level security;
revoke all on public.payment_orders from public, anon, authenticated;
revoke all on public.payment_transactions from public, anon, authenticated;
grant select on public.payment_orders to authenticated;
grant all on public.payment_orders, public.payment_transactions to service_role;

drop policy if exists "Users read their payment orders" on public.payment_orders;
create policy "Users read their payment orders"
  on public.payment_orders for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.confirm_sepay_payment(
  p_transaction_id bigint,
  p_code text,
  p_amount_vnd integer,
  p_receiver_va text,
  p_content text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.payment_orders%rowtype;
  inserted_id bigint;
begin
  if p_transaction_id is null or p_transaction_id <= 0
     or p_code is null or p_amount_vnd is null or p_amount_vnd <= 0
     or p_receiver_va is null then
    return 'ignored';
  end if;

  select * into payment
  from public.payment_orders
  where code = p_code
  for update;

  if not found or payment.status <> 'pending'
     or payment.expires_at < now()
     or payment.amount_vnd <> p_amount_vnd
     or payment.receiver_va <> p_receiver_va then
    return 'ignored';
  end if;

  insert into public.payment_transactions
    (sepay_transaction_id, order_id, amount_vnd, receiver_va, content)
  values (p_transaction_id, payment.id, p_amount_vnd, p_receiver_va, left(p_content, 500))
  on conflict do nothing
  returning sepay_transaction_id into inserted_id;

  if inserted_id is null then
    return 'duplicate';
  end if;

  update public.payment_orders
  set status = 'paid', paid_at = now(), sepay_transaction_id = p_transaction_id
  where id = payment.id;

  update public.app_users
  set bonus_generations = bonus_generations + payment.credits
  where id = payment.user_id;

  if not found then
    raise exception 'payment_profile_missing';
  end if;

  return 'paid';
end;
$$;

revoke all on function public.confirm_sepay_payment(bigint, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.confirm_sepay_payment(bigint, text, integer, text, text)
  to service_role;

commit;
