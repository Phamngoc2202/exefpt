-- Run in Supabase SQL Editor, then enable this function in
-- Authentication > Hooks > Before User Created > Postgres Function.
-- Existing accounts can still sign in. New accounts require @gmail.com.

create or replace function public.hook_gmail_signup(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  signup_email text := btrim(coalesce(event->'user'->>'email', ''));
begin
  if signup_email ~* '^[^[:space:]@]+@gmail[.]com$' then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 400,
      'message', 'Chỉ có thể tạo tài khoản bằng địa chỉ @gmail.com.'
    )
  );
end;
$$;

grant usage on schema public to supabase_auth_admin;
revoke all on function public.hook_gmail_signup(jsonb) from public, anon, authenticated;
grant execute on function public.hook_gmail_signup(jsonb) to supabase_auth_admin;
