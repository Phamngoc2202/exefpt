-- Run after admin.sql and payments.sql. Keep this one-row switch available to the pricing page.
-- Re-running the script preserves the current enabled/disabled choice.

begin;

create table if not exists public.payment_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true
);

insert into public.payment_settings (id, enabled)
values (1, true)
on conflict (id) do nothing;

alter table public.payment_settings enable row level security;
revoke all on public.payment_settings from public, anon, authenticated;
grant select (id, enabled) on public.payment_settings to anon, authenticated;
grant update (enabled) on public.payment_settings to authenticated;
grant select on public.payment_settings to service_role;

drop policy if exists "Everyone reads payment availability" on public.payment_settings;
create policy "Everyone reads payment availability"
  on public.payment_settings for select to anon, authenticated
  using (id = 1);

drop policy if exists "Admins change payment availability" on public.payment_settings;
create policy "Admins change payment availability"
  on public.payment_settings for update to authenticated
  using (id = 1 and (select tripgenie_private.is_app_admin()))
  with check (id = 1 and (select tripgenie_private.is_app_admin()));

-- Serialize new orders with admin toggles so an order cannot slip in after
-- the switch has been turned off, including through a direct service call.
create or replace function tripgenie_private.require_payments_enabled()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  payments_enabled boolean;
begin
  select enabled into payments_enabled
  from public.payment_settings
  where id = 1
  for share;

  if payments_enabled is distinct from true then
    raise exception 'payments_disabled';
  end if;
  return new;
end;
$$;

grant usage on schema tripgenie_private to service_role;
revoke all on function tripgenie_private.require_payments_enabled() from public, anon, authenticated;
grant execute on function tripgenie_private.require_payments_enabled() to service_role;

drop trigger if exists require_payments_enabled on public.payment_orders;
create trigger require_payments_enabled
  before insert on public.payment_orders
  for each row execute function tripgenie_private.require_payments_enabled();

commit;
