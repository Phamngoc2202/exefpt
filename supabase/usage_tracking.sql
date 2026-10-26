-- Run once in Supabase SQL Editor after admin.sql.
-- Tracks active, signed-in usage in small server-validated increments.

begin;

create table if not exists public.user_usage_sessions (
  id uuid primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  last_reported_at timestamptz not null default now(),
  active_seconds bigint not null default 0 check (active_seconds >= 0)
);

create index if not exists user_usage_sessions_user_started_idx
  on public.user_usage_sessions (user_id, started_at desc);

create table if not exists public.user_usage_daily (
  user_id uuid not null references public.app_users(id) on delete cascade,
  activity_date date not null,
  active_seconds bigint not null default 0 check (active_seconds >= 0),
  last_active_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists user_usage_daily_date_idx
  on public.user_usage_daily (activity_date desc);

create table if not exists public.user_usage_totals (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  total_active_seconds bigint not null default 0 check (total_active_seconds >= 0),
  total_sessions integer not null default 0 check (total_sessions >= 0),
  first_tracked_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

alter table public.user_usage_sessions enable row level security;
alter table public.user_usage_daily enable row level security;
alter table public.user_usage_totals enable row level security;

revoke all on public.user_usage_sessions from public, anon, authenticated;
revoke all on public.user_usage_daily from public, anon, authenticated;
revoke all on public.user_usage_totals from public, anon, authenticated;

grant select on public.user_usage_sessions to authenticated;
grant select on public.user_usage_daily to authenticated;
grant select on public.user_usage_totals to authenticated;
grant all on public.user_usage_sessions, public.user_usage_daily, public.user_usage_totals to service_role;

drop policy if exists "Admins read usage sessions" on public.user_usage_sessions;
create policy "Admins read usage sessions"
  on public.user_usage_sessions for select to authenticated
  using ((select tripgenie_private.is_app_admin()));

drop policy if exists "Admins read daily usage" on public.user_usage_daily;
create policy "Admins read daily usage"
  on public.user_usage_daily for select to authenticated
  using ((select tripgenie_private.is_app_admin()));

drop policy if exists "Admins read usage totals" on public.user_usage_totals;
create policy "Admins read usage totals"
  on public.user_usage_totals for select to authenticated
  using ((select tripgenie_private.is_app_admin()));

create or replace function public.record_user_activity(
  p_session_id uuid,
  p_active_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_time timestamptz := clock_timestamp();
  current_date_vn date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  existing_session public.user_usage_sessions%rowtype;
  credited_seconds integer;
  is_new_session boolean := false;
begin
  if current_user_id is null then
    raise exception 'login_required';
  end if;

  if p_session_id is null or p_active_seconds is null
     or p_active_seconds < 1 or p_active_seconds > 60 then
    raise exception 'invalid_activity_report';
  end if;

  select * into existing_session
  from public.user_usage_sessions
  where id = p_session_id
  for update;

  if found and existing_session.user_id <> current_user_id then
    raise exception 'activity_session_owner_mismatch';
  end if;

  if found then
    -- A report cannot credit more time than has elapsed since the previous
    -- report, with a small allowance for timer and network scheduling drift.
    credited_seconds := least(
      p_active_seconds,
      greatest(0, floor(extract(epoch from (current_time - existing_session.last_reported_at)))::integer + 3)
    );

    update public.user_usage_sessions
    set active_seconds = active_seconds + credited_seconds,
        last_active_at = current_time,
        last_reported_at = current_time
    where id = p_session_id;
  else
    credited_seconds := p_active_seconds;
    is_new_session := true;

    insert into public.user_usage_sessions
      (id, user_id, started_at, last_active_at, last_reported_at, active_seconds)
    values
      (p_session_id, current_user_id, current_time, current_time, current_time, credited_seconds);
  end if;

  if credited_seconds > 0 then
    insert into public.user_usage_daily
      (user_id, activity_date, active_seconds, last_active_at)
    values
      (current_user_id, current_date_vn, credited_seconds, current_time)
    on conflict (user_id, activity_date) do update
    set active_seconds = public.user_usage_daily.active_seconds + excluded.active_seconds,
        last_active_at = excluded.last_active_at;

    insert into public.user_usage_totals
      (user_id, total_active_seconds, total_sessions, first_tracked_at, last_active_at)
    values
      (current_user_id, credited_seconds, case when is_new_session then 1 else 0 end, current_time, current_time)
    on conflict (user_id) do update
    set total_active_seconds = public.user_usage_totals.total_active_seconds + excluded.total_active_seconds,
        total_sessions = public.user_usage_totals.total_sessions + excluded.total_sessions,
        last_active_at = excluded.last_active_at;
  end if;

  return credited_seconds;
end;
$$;

revoke all on function public.record_user_activity(uuid, integer) from public, anon, authenticated;
grant execute on function public.record_user_activity(uuid, integer) to authenticated;

commit;
