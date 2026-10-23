-- Run in Supabase SQL Editor after admin.sql, confirmed_accounts.sql, and payments.sql.
-- Starts disabled. Only signups created after the most recent enable are eligible.
-- The cleanup runs once per minute, so removal can lag the selected deadline
-- by up to about one minute. Keep Auth > Email OTP expiration at least as long
-- as the retention selected in Admin (the default Supabase setting is 60 min).

create extension if not exists pg_cron;

begin;

create table if not exists public.signup_cleanup_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  retention_minutes integer not null default 5 check (retention_minutes between 1 and 60),
  installed_at timestamptz not null default now(),
  enabled_since timestamptz
);

alter table public.signup_cleanup_settings
  add column if not exists enabled_since timestamptz;

insert into public.signup_cleanup_settings (id)
values (1)
on conflict (id) do nothing;

-- Safe on a re-run if an earlier version of this migration was already enabled.
update public.signup_cleanup_settings
set enabled_since = now()
where enabled and enabled_since is null;

create or replace function tripgenie_private.record_signup_cleanup_enable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.enabled and not old.enabled then
    new.enabled_since := now();
  elsif not new.enabled then
    new.enabled_since := null;
  end if;
  return new;
end;
$$;

revoke all on function tripgenie_private.record_signup_cleanup_enable()
  from public, anon, authenticated, service_role;

drop trigger if exists record_signup_cleanup_enable on public.signup_cleanup_settings;
create trigger record_signup_cleanup_enable
  before update of enabled on public.signup_cleanup_settings
  for each row execute function tripgenie_private.record_signup_cleanup_enable();

alter table public.signup_cleanup_settings enable row level security;
revoke all on public.signup_cleanup_settings from public, anon, authenticated;
grant select (id, enabled, retention_minutes) on public.signup_cleanup_settings to anon, authenticated;
grant update (enabled, retention_minutes) on public.signup_cleanup_settings to authenticated;

drop policy if exists "Everyone reads signup cleanup settings" on public.signup_cleanup_settings;
create policy "Everyone reads signup cleanup settings"
  on public.signup_cleanup_settings for select to anon, authenticated
  using (id = 1);

drop policy if exists "Admins change signup cleanup settings" on public.signup_cleanup_settings;
create policy "Admins change signup cleanup settings"
  on public.signup_cleanup_settings for update to authenticated
  using (id = 1 and (select tripgenie_private.is_app_admin()))
  with check (id = 1 and (select tripgenie_private.is_app_admin()));

create or replace function tripgenie_private.cleanup_unconfirmed_signups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  setting public.signup_cleanup_settings%rowtype;
  removed_count integer;
begin
  -- The row lock serializes a cleanup run with an admin switch change.
  select * into setting
  from public.signup_cleanup_settings
  where id = 1
  for share;

  if not found or not setting.enabled or setting.enabled_since is null then
    return 0;
  end if;

  with candidates as (
    select account.id
    from auth.users as account
    where account.email_confirmed_at is null
      and account.created_at >= greatest(setting.installed_at, setting.enabled_since)
      and account.created_at <= now() - make_interval(mins => setting.retention_minutes)
      and account.email is not null
      and account.confirmation_sent_at is not null
      and account.invited_at is null
      and account.last_sign_in_at is null
      and account.is_anonymous is distinct from true
      and not exists (
        select 1 from public.payment_orders as payment
        where payment.user_id = account.id
      )
      and not exists (
        select 1 from public.app_users as profile
        where profile.id = account.id and profile.role = 'admin'
      )
    order by account.created_at
    limit 100
    for update of account skip locked
  ), removed as (
    delete from auth.users as account
    using candidates
    where account.id = candidates.id
      and account.email_confirmed_at is null
    returning account.id
  )
  select count(*) into removed_count from removed;

  return removed_count;
end;
$$;

revoke all on function tripgenie_private.cleanup_unconfirmed_signups()
  from public, anon, authenticated, service_role;

-- pg_cron runs this as the database owner; no service key is needed.
select cron.schedule(
  'tripgenie-cleanup-unconfirmed-signups',
  '* * * * *',
  'select tripgenie_private.cleanup_unconfirmed_signups();'
);

-- Minute-by-minute job history would otherwise keep growing indefinitely.
select cron.schedule(
  'tripgenie-cleanup-signup-job-history',
  '0 3 * * *',
  $job$
    delete from cron.job_run_details
    where jobid = (
      select jobid from cron.job
      where jobname = 'tripgenie-cleanup-unconfirmed-signups'
    )
      and end_time < now() - interval '7 days';
  $job$
);

commit;

-- Verify the job is active and review future runs under Integrations > Cron.
select jobid, jobname, schedule, active
from cron.job
where jobname = 'tripgenie-cleanup-unconfirmed-signups';
