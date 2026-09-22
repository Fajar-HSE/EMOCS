-- Stage 1: RLS helper functions, auth wiring, state machine, computed columns.
-- PRD refs: §10 (state machine), §18 (business rules + enforcement layer),
-- §23.3 (RLS helper pattern), §29.2 (audit trigger), §12.2.1 (invite-only)

-- ============================================================
-- RLS helpers (PRD §23.3) — role is embedded in the JWT via the
-- Custom Access Token Hook below, so these never hit the database.
-- ============================================================
create or replace function public.has_role(r text) returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' -> 'roles' ? r, false);
$$;

create or replace function public.has_any_role(variadic rs text[]) returns boolean
language sql stable as $$
  select exists (
    select 1 from unnest(rs) role_name
    where auth.jwt() -> 'app_metadata' -> 'roles' ? role_name
  );
$$;

-- ============================================================
-- Generic audit trigger (PRD §29.2, verbatim)
-- ============================================================
create or replace function fn_audit() returns trigger
language plpgsql security definer as $$
declare changed text[];
begin
  if TG_OP = 'UPDATE' then
    select array_agg(key) into changed
    from jsonb_each(to_jsonb(NEW))
    where to_jsonb(NEW) -> key is distinct from to_jsonb(OLD) -> key;
    if changed is null then return NEW; end if;
  end if;

  insert into audit_logs(table_name, record_id, action, actor_user_id,
                         old_values, new_values, changed_fields)
  values (TG_TABLE_NAME,
          coalesce((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid),
          TG_OP,
          auth.uid(),
          case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
          case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end,
          changed);
  return coalesce(NEW, OLD);
end $$;

create trigger trg_audit_profiles after insert or update or delete on profiles for each row execute function fn_audit();
create trigger trg_audit_user_roles after insert or update or delete on user_roles for each row execute function fn_audit();
create trigger trg_audit_customers after insert or update or delete on customers for each row execute function fn_audit();
create trigger trg_audit_customer_contacts after insert or update or delete on customer_contacts for each row execute function fn_audit();
create trigger trg_audit_trainings after insert or update or delete on trainings for each row execute function fn_audit();
create trigger trg_audit_cities after insert or update or delete on cities for each row execute function fn_audit();
create trigger trg_audit_events after insert or update or delete on events for each row execute function fn_audit();
create trigger trg_audit_event_tasks after insert or update or delete on event_tasks for each row execute function fn_audit();
create trigger trg_audit_invited_emails after insert or update or delete on invited_emails for each row execute function fn_audit();
create trigger trg_audit_attachments after insert or update or delete on attachments for each row execute function fn_audit();

-- ============================================================
-- Invite-only signup gate (PRD §12.2.1). An Admin invite Server Action
-- inserts into invited_emails first (and sends the real invite via the Auth
-- Admin API). If a new auth.users row has no matching invite, no profile or
-- roles are created — the app's DAL (lib/auth/session.ts) then treats that
-- session as unauthenticated. See Stage 1 plan note re: the native
-- "Before User Created" hook as a possible future hardening.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invited_emails%rowtype;
  v_role_id uuid;
  v_role_name text;
  v_company_id uuid;
begin
  select * into v_invite from invited_emails
  where email = lower(new.email) and consumed_at is null;

  if not found then
    return new;
  end if;

  select id into v_company_id from companies order by created_at limit 1;

  insert into profiles (id, company_id, full_name, email, team_id, is_active, created_by)
  values (
    new.id,
    v_company_id,
    coalesce(v_invite.full_name, split_part(new.email, '@', 1)),
    new.email,
    v_invite.team_id,
    true,
    v_invite.invited_by
  );

  foreach v_role_name in array v_invite.roles loop
    select id into v_role_id from roles where name = v_role_name;
    if v_role_id is not null then
      insert into user_roles(user_id, role_id, assigned_by)
      values (new.id, v_role_id, v_invite.invited_by)
      on conflict do nothing;
    end if;
  end loop;

  update invited_emails set consumed_at = now() where email = v_invite.email;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Custom Access Token Hook (PRD §12.2.2): embeds the user's role names
-- into app_metadata.roles on every JWT, so RLS never needs a subquery.
-- Must be wired up manually: Dashboard -> Authentication -> Hooks ->
-- Custom Access Token -> public.custom_access_token_hook.
-- ============================================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_roles_arr jsonb;
begin
  select coalesce(jsonb_agg(r.name), '[]'::jsonb)
  into user_roles_arr
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{app_metadata,roles}', user_roles_arr);
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.user_roles to supabase_auth_admin;
grant select on table public.roles to supabase_auth_admin;

-- ============================================================
-- Event state machine (PRD §10, §18.1). All status changes go through
-- transition_event_status(); a guard trigger blocks any other path
-- (BR-EVT-14).
-- ============================================================
create table event_status_transitions (
  from_status event_status not null,
  to_status event_status not null,
  primary key (from_status, to_status)
);

insert into event_status_transitions (from_status, to_status) values
  ('DRAFT','SUBMITTED'),
  ('SUBMITTED','UNDER_REVIEW'),
  ('UNDER_REVIEW','REVISION_REQUESTED'),
  ('REVISION_REQUESTED','SUBMITTED'),
  ('UNDER_REVIEW','APPROVED'),
  ('UNDER_REVIEW','REJECTED'),
  ('APPROVED','PIC_ASSIGNED'),
  ('PIC_ASSIGNED','PREPARATION'),
  ('PREPARATION','READY'),
  ('READY','RUNNING'),
  ('RUNNING','COMPLETED'),
  ('COMPLETED','POST_EVENT'),
  ('POST_EVENT','FINANCIAL_CLOSING'),
  ('FINANCIAL_CLOSING','CLOSED'),
  ('CLOSED','FINANCIAL_CLOSING'); -- reopen path (E11), role-gated separately below

insert into event_status_transitions (from_status, to_status)
select s, t
from unnest(array['SUBMITTED','UNDER_REVIEW','REVISION_REQUESTED','APPROVED','PIC_ASSIGNED',
                   'PREPARATION','READY','RUNNING','COMPLETED','POST_EVENT','FINANCIAL_CLOSING']::event_status[]) s
cross join unnest(array['CANCELLED','POSTPONED']::event_status[]) t;

create or replace function guard_event_status_change()
returns trigger
language plpgsql
as $$
begin
  if NEW.status is distinct from OLD.status then
    if coalesce(current_setting('emocs.allow_status_transition', true), '') <> 'on' then
      raise exception 'STATUS_MUST_CHANGE_VIA_TRANSITION_FUNCTION' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_event_status_change
  before update on events
  for each row execute function guard_event_status_change();

create or replace function guard_event_progress_write()
returns trigger
language plpgsql
as $$
begin
  if NEW.progress_percentage is distinct from OLD.progress_percentage then
    if coalesce(current_setting('emocs.allow_progress_write', true), '') <> 'on' then
      raise exception 'PROGRESS_PERCENTAGE_IS_SYSTEM_COMPUTED' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_event_progress_write
  before update on events
  for each row execute function guard_event_progress_write();

create or replace function compute_event_is_rush()
returns trigger
language plpgsql
as $$
begin
  if NEW.start_date is not null and NEW.status not in ('DRAFT','CANCELLED','POSTPONED','CLOSED') then
    NEW.is_rush := NEW.start_date < (current_date + 7);
  else
    NEW.is_rush := false;
  end if;
  return new;
end;
$$;

create trigger trg_events_compute_is_rush
  before insert or update on events
  for each row execute function compute_event_is_rush();

create or replace function validate_pic_role()
returns trigger
language plpgsql
as $$
begin
  if NEW.pic_user_id is not null and NEW.pic_user_id is distinct from OLD.pic_user_id then
    if not exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      join profiles p on p.id = ur.user_id
      where ur.user_id = NEW.pic_user_id
        and r.name in ('OPERATIONS','OPERATIONS_MANAGER')
        and p.is_active
    ) then
      raise exception 'PIC_MUST_BE_ACTIVE_OPERATIONS_USER' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_validate_pic_role
  before insert or update of pic_user_id on events
  for each row execute function validate_pic_role();

create or replace function transition_event_status(
  p_event_id uuid,
  p_to_status event_status,
  p_reason text default null,
  p_cancellation_category cancellation_category default null,
  p_metadata jsonb default '{}'::jsonb
) returns events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_status event_status;
  v_is_forward boolean;
  v_is_backward boolean;
  v_is_reopen boolean;
  v_allowed_roles text[];
  v_ok boolean := false;
  v_role text;
begin
  select status into v_from_status from events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_from_status = p_to_status then
    return (select e from events e where e.id = p_event_id);
  end if;

  v_is_reopen := (v_from_status = 'CLOSED');

  if v_is_reopen and not public.has_any_role('ADMIN','MANAGEMENT','FINANCE') then
    raise exception 'EVENT_CLOSED_TERMINAL' using errcode = '42501';
  end if;

  v_is_forward := exists (
    select 1 from event_status_transitions t
    where t.from_status = v_from_status and t.to_status = p_to_status
  );
  v_is_backward := (not v_is_forward) and exists (
    select 1 from event_status_transitions t
    where t.from_status = p_to_status and t.to_status = v_from_status
  );

  if not v_is_forward and not v_is_backward then
    raise exception 'ILLEGAL_TRANSITION: % -> %', v_from_status, p_to_status using errcode = '22023';
  end if;

  if public.has_role('ADMIN') then
    v_ok := true;
  elsif v_is_reopen then
    v_ok := public.has_any_role('MANAGEMENT','FINANCE');
    if v_ok and (p_reason is null or length(trim(p_reason)) = 0) then
      raise exception 'REASON_REQUIRED_FOR_REOPEN' using errcode = '22004';
    end if;
  elsif v_is_backward then
    v_ok := public.has_role('OPERATIONS_MANAGER');
    if v_ok and (p_reason is null or length(trim(p_reason)) = 0) then
      raise exception 'REASON_REQUIRED_FOR_BACKWARD_TRANSITION' using errcode = '22004';
    end if;
  else
    v_allowed_roles := case p_to_status
      when 'SUBMITTED' then array['SALES','SALES_MANAGER']
      when 'UNDER_REVIEW' then array['OPERATIONS_MANAGER']
      when 'REVISION_REQUESTED' then array['OPERATIONS_MANAGER']
      when 'APPROVED' then array['OPERATIONS_MANAGER']
      when 'REJECTED' then array['OPERATIONS_MANAGER']
      when 'PIC_ASSIGNED' then array['OPERATIONS_MANAGER']
      when 'PREPARATION' then array['OPERATIONS','OPERATIONS_MANAGER']
      when 'READY' then array['OPERATIONS','OPERATIONS_MANAGER']
      when 'RUNNING' then array['OPERATIONS','OPERATIONS_MANAGER']
      when 'COMPLETED' then array['OPERATIONS','OPERATIONS_MANAGER']
      when 'POST_EVENT' then array['OPERATIONS','OPERATIONS_MANAGER']
      when 'FINANCIAL_CLOSING' then array['FINANCE']
      when 'CLOSED' then array['FINANCE','MANAGEMENT']
      when 'CANCELLED' then array['OPERATIONS_MANAGER','SALES_MANAGER']
      when 'POSTPONED' then array['OPERATIONS_MANAGER','SALES_MANAGER']
      else array[]::text[]
    end;
    foreach v_role in array v_allowed_roles loop
      if public.has_role(v_role) then
        v_ok := true;
      end if;
    end loop;
  end if;

  if not v_ok then
    raise exception 'FORBIDDEN_TRANSITION' using errcode = '42501';
  end if;

  if p_to_status in ('REJECTED','CANCELLED','POSTPONED','REVISION_REQUESTED')
     and (p_reason is null or length(trim(p_reason)) = 0) then
    raise exception 'REASON_REQUIRED' using errcode = '22004';
  end if;

  if p_to_status = 'CANCELLED' and p_cancellation_category is null then
    raise exception 'CANCELLATION_CATEGORY_REQUIRED' using errcode = '22004';
  end if;

  perform set_config('emocs.allow_status_transition', 'on', true);
  perform set_config('emocs.allow_progress_write', 'on', true);

  update events set
    status = p_to_status,
    event_code = case
      when v_from_status = 'DRAFT' and p_to_status = 'SUBMITTED' and event_code is null
      then generate_event_code() else event_code
    end,
    revision_note = case when p_to_status = 'REVISION_REQUESTED' then p_reason else revision_note end,
    rejection_reason = case when p_to_status = 'REJECTED' then p_reason else rejection_reason end,
    cancellation_reason = case when p_to_status = 'CANCELLED' then p_reason else cancellation_reason end,
    cancellation_category = case when p_to_status = 'CANCELLED' then p_cancellation_category else cancellation_category end,
    submitted_at = case when p_to_status = 'SUBMITTED' and submitted_at is null then now() else submitted_at end,
    approved_at = case when p_to_status = 'APPROVED' then now() else approved_at end,
    completed_at = case when p_to_status = 'COMPLETED' then now() else completed_at end,
    closed_at = case when p_to_status = 'CLOSED' then now() else closed_at end,
    start_date = case when p_to_status = 'POSTPONED' then null else start_date end,
    end_date = case when p_to_status = 'POSTPONED' then null else end_date end,
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_event_id;

  if p_to_status = 'CANCELLED' then
    update event_tasks set status = 'CANCELLED', updated_at = now(), updated_by = auth.uid()
    where event_id = p_event_id and status not in ('DONE','CANCELLED');
  end if;

  insert into event_status_history(event_id, from_status, to_status, changed_by, reason, metadata)
  values (p_event_id, v_from_status, p_to_status, auth.uid(), p_reason, p_metadata);

  return (select e from events e where e.id = p_event_id);
end;
$$;

grant execute on function transition_event_status(uuid, event_status, text, cancellation_category, jsonb) to authenticated;
revoke execute on function transition_event_status(uuid, event_status, text, cancellation_category, jsonb) from public, anon;

create or replace function assign_pic(
  p_event_id uuid,
  p_pic_user_id uuid,
  p_backup_pic_user_id uuid default null,
  p_responsibility_note text default null
) returns events
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_any_role('OPERATIONS_MANAGER', 'ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update events set
    pic_user_id = p_pic_user_id,
    backup_pic_user_id = p_backup_pic_user_id,
    pic_assigned_at = now(),
    pic_assigned_by = auth.uid(),
    responsibility_note = coalesce(p_responsibility_note, responsibility_note),
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_event_id;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  return transition_event_status(p_event_id, 'PIC_ASSIGNED');
end;
$$;

grant execute on function assign_pic(uuid, uuid, uuid, text) to authenticated;
revoke execute on function assign_pic(uuid, uuid, uuid, text) from public, anon;

-- ============================================================
-- Task rules (PRD §18.2) + progress_percentage (BR-EVT-20, system-computed)
-- ============================================================
create or replace function recalc_event_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid := coalesce(NEW.event_id, OLD.event_id);
  v_total int;
  v_done int;
  v_pct int;
begin
  select count(*) filter (where status <> 'CANCELLED'),
         count(*) filter (where status = 'DONE')
  into v_total, v_done
  from event_tasks
  where event_id = v_event_id and deleted_at is null;

  v_pct := case when v_total = 0 then 0 else round((v_done::numeric / v_total) * 100) end;

  perform set_config('emocs.allow_progress_write', 'on', true);
  update events set progress_percentage = v_pct where id = v_event_id;

  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_recalc_event_progress
  after insert or update or delete on event_tasks
  for each row execute function recalc_event_progress();

create or replace function set_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'DONE' and OLD.status is distinct from 'DONE' then
    NEW.completed_at := now();
    NEW.completed_by := auth.uid();
  elsif NEW.status <> 'DONE' and OLD.status = 'DONE' then
    NEW.completed_at := null;
    NEW.completed_by := null;
  end if;
  return new;
end;
$$;

create trigger trg_event_tasks_completed_at
  before update on event_tasks
  for each row execute function set_task_completed_at();

create or replace function guard_task_parent_event_state()
returns trigger
language plpgsql
as $$
declare
  v_status event_status;
begin
  select status into v_status from events where id = NEW.event_id;
  if v_status in ('CLOSED','CANCELLED') then
    raise exception 'CANNOT_ADD_TASKS_TO_% EVENT', v_status using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_guard_task_parent_event_state
  before insert on event_tasks
  for each row execute function guard_task_parent_event_state();
