-- Run once in Supabase SQL Editor after admin.sql.
-- Keep the admin directory in sync with Auth email confirmation.

begin;

alter table public.app_users
  add column if not exists email_confirmed_at timestamptz;

create or replace function tripgenie_private.sync_app_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_users (id, email, email_confirmed_at, created_at)
  values (new.id, new.email, new.email_confirmed_at, new.created_at)
  on conflict (id) do update
  set email = excluded.email,
      email_confirmed_at = excluded.email_confirmed_at;
  return new;
end;
$$;

revoke all on function tripgenie_private.sync_app_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_sync_app_user on auth.users;
create trigger on_auth_user_sync_app_user
after insert or update of email, email_confirmed_at on auth.users
for each row execute function tripgenie_private.sync_app_user();

update public.app_users as account
set email = signed_up.email,
    email_confirmed_at = signed_up.email_confirmed_at
from auth.users as signed_up
where account.id = signed_up.id
  and (account.email is distinct from signed_up.email
       or account.email_confirmed_at is distinct from signed_up.email_confirmed_at);

commit;
