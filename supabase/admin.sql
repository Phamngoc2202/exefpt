-- Run in Supabase SQL Editor after the owner account has confirmed its email.
-- This adds app-level roles only; existing trips policies stay unchanged.

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

-- New public tables can inherit broad API grants. Restrict writes to role only.
revoke all on table public.app_users from anon, authenticated;
grant select on table public.app_users to authenticated;
grant update (role) on table public.app_users to authenticated;

-- Keep the privilege-check helper outside the exposed API schemas.
create schema if not exists tripgenie_private;
revoke all on schema tripgenie_private from public, anon, authenticated;
grant usage on schema tripgenie_private to authenticated;

create or replace function tripgenie_private.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_users
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function tripgenie_private.is_app_admin() from public, anon, authenticated;
grant execute on function tripgenie_private.is_app_admin() to authenticated;

drop policy if exists "Users read own role; admins read users" on public.app_users;
create policy "Users read own role; admins read users"
on public.app_users for select
to authenticated
using (id = (select auth.uid()) or (select tripgenie_private.is_app_admin()));

drop policy if exists "Admins manage roles except their own demotion" on public.app_users;
create policy "Admins manage roles except their own demotion"
on public.app_users for update
to authenticated
using ((select tripgenie_private.is_app_admin()))
with check (
  (select tripgenie_private.is_app_admin())
  and (id <> (select auth.uid()) or role = 'admin')
);

-- The trigger keeps a lightweight user directory in the public API.
-- It never copies passwords or promotes new signups to admin.
create or replace function tripgenie_private.sync_app_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_users (id, email, created_at)
  values (new.id, new.email, new.created_at)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

revoke all on function tripgenie_private.sync_app_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_sync_app_user on auth.users;
create trigger on_auth_user_sync_app_user
after insert or update of email on auth.users
for each row execute function tripgenie_private.sync_app_user();

-- Include accounts that registered before this script was installed.
insert into public.app_users (id, email, created_at)
select id, email, created_at from auth.users
on conflict (id) do update set email = excluded.email;

-- Bootstrap the existing, email-confirmed owner by immutable user ID.
-- Re-running this script will keep that owner as admin.
update public.app_users as account
set role = 'admin'
from auth.users as signed_up
where account.id = signed_up.id
  and lower(signed_up.email) = 'phamngoc0045@gmail.com'
  and signed_up.email_confirmed_at is not null;

-- Expect one row with role = admin. If no row appears, verify the address
-- under Authentication > Users, confirm its email, then re-run this script.
select id, email, role from public.app_users
where lower(email) = 'phamngoc0045@gmail.com';
