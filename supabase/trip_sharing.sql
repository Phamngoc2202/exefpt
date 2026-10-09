-- Run once in Supabase Dashboard > SQL Editor after schema.sql.
-- Creates revocable, read-only public links containing a safe snapshot of a trip.

create table if not exists public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  share_token uuid not null unique default gen_random_uuid(),
  snapshot jsonb not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_shares_token_idx on public.trip_shares(share_token);
create index if not exists trip_shares_owner_idx on public.trip_shares(owner_id);

alter table public.trip_shares enable row level security;

-- The table is never exposed directly. Public reads must go through the token RPC.
revoke all on table public.trip_shares from public, anon, authenticated;

create or replace function public.create_trip_share(p_trip_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  source_trip public.trips%rowtype;
  result_token uuid;
begin
  if current_user_id is null then
    raise exception 'login_required';
  end if;

  select * into source_trip
  from public.trips
  where id = p_trip_id and user_id = current_user_id;

  if not found then
    raise exception 'trip_not_found';
  end if;

  insert into public.trip_shares (trip_id, owner_id, snapshot)
  values (
    source_trip.id,
    current_user_id,
    to_jsonb(source_trip) - 'user_id' - 'generation_event_id'
  )
  on conflict (trip_id) do update
  set snapshot = excluded.snapshot,
      owner_id = excluded.owner_id,
      revoked_at = null,
      updated_at = now()
  returning share_token into result_token;

  return result_token;
end;
$$;

create or replace function public.get_shared_trip(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select snapshot
  from public.trip_shares
  where share_token = p_token and revoked_at is null
  limit 1;
$$;

create or replace function public.revoke_trip_share(p_trip_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'login_required';
  end if;

  update public.trip_shares
  set revoked_at = now(), updated_at = now()
  where trip_id = p_trip_id and owner_id = (select auth.uid());

  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

revoke all on function public.create_trip_share(uuid) from public, anon, authenticated;
revoke all on function public.get_shared_trip(uuid) from public, anon, authenticated;
revoke all on function public.revoke_trip_share(uuid) from public, anon, authenticated;

grant execute on function public.create_trip_share(uuid) to authenticated;
grant execute on function public.get_shared_trip(uuid) to anon, authenticated;
grant execute on function public.revoke_trip_share(uuid) to authenticated;
