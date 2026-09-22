-- 0041_public_auth_stats.sql
-- Public aggregate for the login hero ticker ("N acara aktif dipantau hari ini").
--
-- SECURITY DEFINER + granted to anon/authenticated: it returns a single
-- integer aggregate — no row-level data ever leaves this function, so it is
-- safe to call pre-login. "Active today" mirrors ACTIVE_STATUSES
-- (app/(dashboard)/events/status-options.ts): every stage before
-- completion/cancellation, excluding DRAFT, whose date window covers today.

create or replace function public.get_public_auth_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'active_events_today',
    (
      select count(*)
      from events
      where deleted_at is null
        and status in (
          'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED',
          'PIC_ASSIGNED', 'PREPARATION', 'READY', 'RUNNING'
        )
        and start_date <= current_date
        and (end_date is null or end_date >= current_date)
    )
  );
$$;

grant execute on function public.get_public_auth_stats() to anon, authenticated;
