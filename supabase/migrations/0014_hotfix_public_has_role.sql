-- Hotfix: 0012 was pushed with a regression (auth.has_role/auth.has_any_role
-- instead of public.has_role/public.has_any_role, per the Stage 1 fix) that
-- broke every event status transition. This migration is a byte-for-byte
-- re-application of the corrected 0012 (which has since been fixed in place
-- for fresh installs) so the already-migrated remote database gets the fix
-- too -- `supabase db push` tracks migrations by filename, not content, so
-- editing 0012 alone would not re-run it here.

-- Stage 7: Notifications (M13, FR-NOT-01..03, PRD §22.2 matrix).
-- In-app notifications are emitted from the same trusted, centralized
-- functions that already enforce the state machine (transition_event_status,
-- assign_pic) and from a small trigger on event_tasks — never from the
-- client, so a notification always reflects something that actually
-- happened. Email delivery (notification_deliveries) is wired in Stage 8's
-- Edge Function; this migration only guarantees the in-app row + Realtime
-- event exist, which is already most of FR-NOT-01.

create or replace function create_notification(
  p_recipient_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id uuid,
  p_link_url text,
  p_priority notification_priority default 'MEDIUM'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_user_id is null then
    return;
  end if;
  insert into notifications (recipient_user_id, type, title, body, entity_type, entity_id, link_url, priority)
  values (p_recipient_user_id, p_type, p_title, p_body, p_entity_type, p_entity_id, p_link_url, p_priority);
end;
$$;

-- Dispatch table for event status changes (N01, N04, N05, N06, N13, N14,
-- N15). Called at the end of transition_event_status() with the row
-- *after* the update, so it can read the new pic/sales/etc columns.
create or replace function notify_event_status_change(
  p_event events,
  p_from_status event_status,
  p_to_status event_status,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ops_manager record;
  v_link text := '/events/' || p_event.id;
  v_label text := coalesce(p_event.event_code, p_event.event_name);
begin
  if p_to_status = 'SUBMITTED' then
    for v_ops_manager in
      select p.id from profiles p
      join user_roles ur on ur.user_id = p.id
      join roles r on r.id = ur.role_id
      where r.name = 'OPERATIONS_MANAGER' and p.is_active
    loop
      perform create_notification(v_ops_manager.id, 'EVENT_SUBMITTED',
        'Request baru: ' || v_label, p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');
    end loop;

  elsif p_to_status = 'APPROVED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_APPROVED',
      v_label || ' disetujui', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');

  elsif p_to_status = 'REJECTED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_REJECTED',
      v_label || ' ditolak', p_reason, 'event', p_event.id, v_link, 'HIGH');

  elsif p_to_status = 'REVISION_REQUESTED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_REVISION_REQUESTED',
      v_label || ' perlu revisi', p_reason, 'event', p_event.id, v_link, 'HIGH');

  elsif p_to_status = 'COMPLETED' then
    perform create_notification(p_event.sales_user_id, 'EVENT_COMPLETED',
      v_label || ' selesai', p_event.event_name, 'event', p_event.id, v_link, 'MEDIUM');

  elsif p_to_status in ('CANCELLED', 'POSTPONED') then
    perform create_notification(p_event.sales_user_id, 'EVENT_' || p_to_status,
      v_label || ' ' || (case when p_to_status = 'CANCELLED' then 'dibatalkan' else 'ditunda' end),
      p_reason, 'event', p_event.id, v_link, 'HIGH');
    perform create_notification(p_event.pic_user_id, 'EVENT_' || p_to_status,
      v_label || ' ' || (case when p_to_status = 'CANCELLED' then 'dibatalkan' else 'ditunda' end),
      p_reason, 'event', p_event.id, v_link, 'HIGH');

  else
    -- N13 generic fallback: any other status change notifies the owner.
    perform create_notification(p_event.sales_user_id, 'EVENT_STATUS_CHANGED',
      v_label || ' → ' || p_to_status, null, 'event', p_event.id, v_link, 'MEDIUM');
  end if;
end;
$$;

-- Re-create transition_event_status with a notification dispatch call
-- appended right before the return (identical body otherwise to 0007).
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
  v_event events;
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
  where id = p_event_id
  returning * into v_event;

  if p_to_status = 'CANCELLED' then
    update event_tasks set status = 'CANCELLED', updated_at = now(), updated_by = auth.uid()
    where event_id = p_event_id and status not in ('DONE','CANCELLED');
  end if;

  insert into event_status_history(event_id, from_status, to_status, changed_by, reason, metadata)
  values (p_event_id, v_from_status, p_to_status, auth.uid(), p_reason, p_metadata);

  perform notify_event_status_change(v_event, v_from_status, p_to_status, p_reason);

  return v_event;
end;
$$;

grant execute on function transition_event_status(uuid, event_status, text, cancellation_category, jsonb) to authenticated;
revoke execute on function transition_event_status(uuid, event_status, text, cancellation_category, jsonb) from public, anon;

-- Re-create assign_pic with a notification dispatch call (N07) appended.
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
declare
  v_event events;
  v_link text;
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
  where id = p_event_id
  returning * into v_event;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_link := '/events/' || p_event_id;

  perform create_notification(p_pic_user_id, 'PIC_ASSIGNED',
    'Anda ditugaskan sebagai PIC: ' || coalesce(v_event.event_code, v_event.event_name),
    v_event.event_name, 'event', p_event_id, v_link, 'MEDIUM');
  perform create_notification(p_backup_pic_user_id, 'PIC_ASSIGNED_BACKUP',
    'Anda ditugaskan sebagai backup PIC: ' || coalesce(v_event.event_code, v_event.event_name),
    v_event.event_name, 'event', p_event_id, v_link, 'MEDIUM');
  perform create_notification(v_event.sales_user_id, 'PIC_ASSIGNED_NOTICE',
    'PIC ditetapkan untuk ' || coalesce(v_event.event_code, v_event.event_name),
    v_event.event_name, 'event', p_event_id, v_link, 'MEDIUM');

  return transition_event_status(p_event_id, 'PIC_ASSIGNED');
end;
$$;

grant execute on function assign_pic(uuid, uuid, uuid, text) to authenticated;
revoke execute on function assign_pic(uuid, uuid, uuid, text) from public, anon;

-- N09: task assigned.
create or replace function notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
begin
  select * into v_event from events where id = NEW.event_id;
  perform create_notification(NEW.assignee_user_id, 'TASK_ASSIGNED',
    'Task baru: ' || NEW.title, coalesce(v_event.event_code, v_event.event_name),
    'event_task', NEW.id, '/events/' || NEW.event_id, 'MEDIUM');
  return NEW;
end;
$$;

-- trg_notify_task_assigned already exists from 0012 (that trigger creation
-- succeeded fine; only the function bodies above had the regression), so
-- it is intentionally not re-created here.
