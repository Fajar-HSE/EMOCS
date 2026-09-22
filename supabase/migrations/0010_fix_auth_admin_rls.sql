-- Fix: custom_access_token_hook() runs as `supabase_auth_admin`, which is
-- not the `authenticated` role our RLS policies target — table-level GRANTs
-- (0007) are necessary but not sufficient, RLS still blocks every read
-- without a matching policy. Add the missing policies so the hook can
-- actually see a user's roles (this is the standard Supabase recipe for
-- the Custom Access Token Hook, omitted by mistake in 0008).

create policy user_roles_select_auth_admin on user_roles
  for select to supabase_auth_admin
  using (true);

create policy roles_select_auth_admin on roles
  for select to supabase_auth_admin
  using (true);
