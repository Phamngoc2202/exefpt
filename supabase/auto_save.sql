-- Run after trip_quota.sql in Supabase SQL Editor.
-- Creates the quota event and saved trip in one database transaction.
-- If either insert fails, neither the trip nor the consumed credit is kept.

create or replace function public.create_saved_trip(
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_budget numeric,
  p_travel_with text,
  p_travel_style text,
  p_interests text[],
  p_itinerary jsonb,
  p_budget_plan jsonb
)
returns public.trips
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  event_id uuid;
  saved_trip public.trips%rowtype;
begin
  if current_user_id is null then
    raise exception 'login_required';
  end if;

  insert into public.trip_generation_events (user_id)
  values (current_user_id)
  returning id into event_id;

  insert into public.trips (
    user_id, generation_event_id, destination, start_date, end_date,
    budget, travel_with, travel_style, interests, itinerary, budget_plan
  ) values (
    current_user_id, event_id, p_destination, p_start_date, p_end_date,
    p_budget, p_travel_with, p_travel_style, coalesce(p_interests, '{}'::text[]),
    p_itinerary, p_budget_plan
  ) returning * into saved_trip;

  return saved_trip;
end;
$$;

revoke all on function public.create_saved_trip(text, date, date, numeric, text, text, text[], jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.create_saved_trip(text, date, date, numeric, text, text, text[], jsonb, jsonb)
to authenticated;
