-- Phase 2 §13.6 Issue Management + wiring generate_event_checklist() into
-- assign_pic() (§13.7: checklist generated "saat status PIC_ASSIGNED").

create type issue_category as enum ('TRAINER','VENUE','PARTICIPANT','EQUIPMENT','MATERIAL','CUSTOMER','LOGISTIC','FINANCE','OTHER');
create type issue_severity as enum ('LOW','MEDIUM','HIGH','CRITICAL');
create type issue_status as enum ('OPEN','IN_PROGRESS','RESOLVED','CLOSED');

create table event_issues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  category issue_category not null,
  severity issue_severity not null default 'MEDIUM',
  description text,
  assignee_user_id uuid references profiles(id),
  due_date date,
  status issue_status not null default 'OPEN',
  resolution text,
  root_cause text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint chk_event_issues_root_cause check (
    status <> 'CLOSED' or severity not in ('HIGH','CRITICAL') or root_cause is not null
  )
);
create trigger trg_event_issues_updated_at before update on event_issues for each row execute function set_updated_at();
create trigger trg_audit_event_issues after insert or update or delete on event_issues for each row execute function fn_audit();
create index idx_event_issues_event on event_issues(event_id);

-- N18: CRITICAL issue -> immediate notification to Ops Manager + Management
-- + the event's Sales owner (PRD §22.2). Fires on creation, and again if an
-- existing issue escalates to CRITICAL.
create or replace function notify_critical_issue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
  v_recipient record;
  v_link text;
begin
  if NEW.severity <> 'CRITICAL' or (TG_OP = 'UPDATE' and OLD.severity = 'CRITICAL') then
    return NEW;
  end if;

  select * into v_event from events where id = NEW.event_id;
  v_link := '/events/' || NEW.event_id;

  perform create_notification(v_event.sales_user_id, 'ISSUE_CRITICAL',
    'Issue KRITIKAL: ' || NEW.title, coalesce(v_event.event_code, v_event.event_name),
    'event_issue', NEW.id, v_link, 'CRITICAL');

  for v_recipient in
    select p.id from profiles p
    join user_roles ur on ur.user_id = p.id
    join roles r on r.id = ur.role_id
    where r.name in ('OPERATIONS_MANAGER', 'MANAGEMENT') and p.is_active
  loop
    perform create_notification(v_recipient.id, 'ISSUE_CRITICAL',
      'Issue KRITIKAL: ' || NEW.title, coalesce(v_event.event_code, v_event.event_name),
      'event_issue', NEW.id, v_link, 'CRITICAL');
  end loop;

  return NEW;
end;
$$;

create trigger trg_notify_critical_issue
  after insert or update on event_issues
  for each row execute function notify_critical_issue();

alter table event_issues enable row level security;
create policy event_issues_select on event_issues for select to authenticated
  using (exists (select 1 from events e where e.id = event_issues.event_id));
create policy event_issues_insert on event_issues for insert to authenticated
  with check (exists (select 1 from events e where e.id = event_issues.event_id));
create policy event_issues_update on event_issues for update to authenticated
  using (
    public.has_any_role('OPERATIONS_MANAGER','ADMIN','MANAGEMENT')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = event_issues.event_id and e.pic_user_id = (select auth.uid())
    ))
  )
  with check (
    public.has_any_role('OPERATIONS_MANAGER','ADMIN','MANAGEMENT')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = event_issues.event_id and e.pic_user_id = (select auth.uid())
    ))
  );

-- Re-create assign_pic (identical to 0012/0014, only addition: generate
-- the event's checklist from the best-matching template once a PIC is on
-- the hook for it — §13.7).
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

  perform generate_event_checklist(p_event_id);

  return transition_event_status(p_event_id, 'PIC_ASSIGNED');
end;
$$;

grant execute on function assign_pic(uuid, uuid, uuid, text) to authenticated;
revoke execute on function assign_pic(uuid, uuid, uuid, text) from public, anon;
