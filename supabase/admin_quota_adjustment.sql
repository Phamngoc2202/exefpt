-- Run after admin.sql and trip_quota.sql in Supabase SQL Editor.
-- Allows an authenticated app admin to set the total remaining trip generations.

create or replace function public.admin_set_user_trip_quota(
  p_user_id uuid,
  p_remaining integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.app_users%rowtype;
  free_remaining integer;
begin
  if (select auth.uid()) is null
     or not (select tripgenie_private.is_app_admin()) then
    raise exception 'admin_required';
  end if;

  if p_user_id is null or p_remaining is null
     or p_remaining < 0 or p_remaining > 1000 then
    raise exception 'invalid_trip_quota';
  end if;

  select * into account
  from public.app_users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user_not_found';
  end if;

  free_remaining := greatest(0, 1 - account.generations_used);

  -- The initial free generation is represented by generations_used = 0.
  -- When an admin sets the total to zero, mark that initial allowance as
  -- unavailable without creating or changing a generation event.
  update public.app_users
  set generations_used = case
        when p_remaining = 0 and free_remaining > 0 then 1
        else generations_used
      end,
      bonus_generations = greatest(0, p_remaining - free_remaining)
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_set_user_trip_quota(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.admin_set_user_trip_quota(uuid, integer)
  to authenticated;
