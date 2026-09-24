-- Run once in Supabase SQL Editor after admin.sql. Safe to re-run.
-- Every account gets one initial trip generation. Admins can add credits.
-- The application calls auto_save.sql to create the event and saved trip together.

begin;

alter table public.app_users
  add column if not exists generations_used integer not null default 0,
  add column if not exists bonus_generations integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_users_trip_quota_check' and conrelid = 'public.app_users'::regclass) then
    alter table public.app_users add constraint app_users_trip_quota_check
      check (generations_used >= 0 and bonus_generations >= 0);
  end if;
end;
$$;

create table if not exists public.trip_generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  trip_id uuid unique
);

create index if not exists trip_generation_events_user_id_idx
on public.trip_generation_events(user_id);

alter table public.trip_generation_events enable row level security;
revoke all on table public.trip_generation_events from anon, authenticated;
grant select on table public.trip_generation_events to authenticated;
grant insert (user_id) on table public.trip_generation_events to authenticated;

drop policy if exists "Users read their generation events" on public.trip_generation_events;
create policy "Users read their generation events"
on public.trip_generation_events for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users request their own generation" on public.trip_generation_events;
create policy "Users request their own generation"
on public.trip_generation_events for insert to authenticated
with check (user_id = (select auth.uid()));

alter table public.trips
  add column if not exists generation_event_id uuid references public.trip_generation_events(id);
create unique index if not exists trips_generation_event_id_unique
on public.trips(generation_event_id) where generation_event_id is not null;

-- Existing saved trips consume the initial allowance. Events survive trip deletion.
-- Drop the trigger first when re-running this migration, or backfill conflicts
-- would be mistaken for new generation attempts.
drop trigger if exists consume_trip_generation on public.trip_generation_events;
insert into public.trip_generation_events (user_id, created_at, trip_id)
select user_id, created_at, id from public.trips
where generation_event_id is null
on conflict (trip_id) do nothing;

update public.app_users as account
set generations_used = greatest(account.generations_used, (
  select count(*)::integer from public.trip_generation_events as event
  where event.user_id = account.id
));

create or replace function tripgenie_private.consume_trip_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.app_users%rowtype;
begin
  if (select auth.uid()) is distinct from new.user_id then
    raise exception 'generation_owner_mismatch';
  end if;

  -- Serialize requests for the same user to prevent double spending.
  select * into account from public.app_users where id = new.user_id for update;
  if not found then
    raise exception 'generation_profile_missing';
  end if;
  if account.generations_used >= 1 and account.bonus_generations <= 0 then
    raise exception 'trip_limit_reached';
  end if;

  update public.app_users
  set generations_used = generations_used + 1,
      bonus_generations = case
        when account.generations_used >= 1 then bonus_generations - 1
        else bonus_generations
      end
  where id = new.user_id;

  new.created_at := clock_timestamp();
  new.trip_id := null;
  return new;
end;
$$;

revoke all on function tripgenie_private.consume_trip_generation() from public, anon, authenticated;
create trigger consume_trip_generation
before insert on public.trip_generation_events
for each row execute function tripgenie_private.consume_trip_generation();

create or replace function tripgenie_private.attach_trip_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_user_id uuid;
  event_trip_id uuid;
begin
  if (select auth.uid()) is distinct from new.user_id or new.generation_event_id is null then
    raise exception 'generation_required';
  end if;

  select user_id, trip_id into event_user_id, event_trip_id
  from public.trip_generation_events
  where id = new.generation_event_id
  for update;

  if not found or event_user_id is distinct from new.user_id or event_trip_id is not null then
    raise exception 'generation_invalid_or_used';
  end if;

  update public.trip_generation_events set trip_id = new.id where id = new.generation_event_id;
  return new;
end;
$$;

revoke all on function tripgenie_private.attach_trip_generation() from public, anon, authenticated;
drop trigger if exists attach_trip_generation on public.trips;
create trigger attach_trip_generation
before insert on public.trips
for each row execute function tripgenie_private.attach_trip_generation();

create or replace function tripgenie_private.keep_trip_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id or new.generation_event_id is distinct from old.generation_event_id then
    raise exception 'trip_generation_is_immutable';
  end if;
  return new;
end;
$$;

revoke all on function tripgenie_private.keep_trip_generation() from public, anon, authenticated;
drop trigger if exists keep_trip_generation on public.trips;
create trigger keep_trip_generation
before update of user_id, generation_event_id on public.trips
for each row execute function tripgenie_private.keep_trip_generation();

create table if not exists public.trip_credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid default auth.uid() references auth.users(id) on delete set null,
  amount integer not null check (amount between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.trip_credit_grants enable row level security;
revoke all on table public.trip_credit_grants from anon, authenticated;
grant select on table public.trip_credit_grants to authenticated;
grant insert (user_id, amount) on table public.trip_credit_grants to authenticated;

drop policy if exists "Admins read trip credit grants" on public.trip_credit_grants;
create policy "Admins read trip credit grants"
on public.trip_credit_grants for select to authenticated
using ((select tripgenie_private.is_app_admin()));

drop policy if exists "Admins grant trip credits" on public.trip_credit_grants;
create policy "Admins grant trip credits"
on public.trip_credit_grants for insert to authenticated
with check (granted_by = (select auth.uid()) and (select tripgenie_private.is_app_admin()));

create or replace function tripgenie_private.apply_trip_credit_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from new.granted_by or not (select tripgenie_private.is_app_admin()) then
    raise exception 'admin_required';
  end if;
  update public.app_users
  set bonus_generations = bonus_generations + new.amount
  where id = new.user_id;
  if not found then
    raise exception 'generation_profile_missing';
  end if;
  return new;
end;
$$;

revoke all on function tripgenie_private.apply_trip_credit_grant() from public, anon, authenticated;
drop trigger if exists apply_trip_credit_grant on public.trip_credit_grants;
create trigger apply_trip_credit_grant
after insert on public.trip_credit_grants
for each row execute function tripgenie_private.apply_trip_credit_grant();

commit;

-- Check after running: existing accounts with saved trips should have used >= 1.
select email, generations_used, bonus_generations
from public.app_users order by created_at desc limit 20;
