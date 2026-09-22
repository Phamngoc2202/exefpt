-- Run this file once in Supabase Dashboard > SQL Editor.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget numeric(12, 0) not null check (budget >= 0),
  travel_with text,
  travel_style text,
  interests text[] not null default '{}',
  itinerary jsonb not null default '[]'::jsonb,
  budget_plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_created_at_idx on public.trips(created_at desc);

alter table public.trips enable row level security;

revoke all on table public.trips from anon, authenticated;
grant select, insert, update, delete on table public.trips to authenticated;

drop policy if exists "Users can view their trips" on public.trips;
create policy "Users can view their trips"
on public.trips for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their trips" on public.trips;
create policy "Users can create their trips"
on public.trips for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their trips" on public.trips;
create policy "Users can update their trips"
on public.trips for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their trips" on public.trips;
create policy "Users can delete their trips"
on public.trips for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_trips_updated_at on public.trips;
create trigger set_trips_updated_at
before update on public.trips
for each row execute function public.set_updated_at();
