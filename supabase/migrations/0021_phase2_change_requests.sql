-- Phase 2 §13.9 Event Change Request. Applying an approved request writes
-- straight to the events row via a whitelisted column set (never raw user
-- input in the dynamic SQL) and, per the E02 edge case, un-confirms any
-- already-CONFIRMED trainer/venue bookings when the date changes so they
-- go through re-confirmation instead of silently staying "confirmed" for
-- a date that's no longer accurate.

create type change_request_status as enum ('PENDING','APPROVED','REJECTED');

create table event_change_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  field_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  cost_impact_note text,
  status change_request_status not null default 'PENDING',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint chk_change_request_field check (
    field_name in ('start_date','end_date','location_name','participant_count','training_id')
  )
);
create index idx_event_change_requests_event on event_change_requests(event_id);

create or replace function apply_change_request(p_request_id uuid, p_approve boolean, p_rejection_reason text default null)
returns event_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req event_change_requests;
  v_event events;
  v_link text;
begin
  if not public.has_role('OPERATIONS_MANAGER') and not public.has_role('ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_req from event_change_requests where id = p_request_id and status = 'PENDING' for update;
  if not found then
    raise exception 'CHANGE_REQUEST_NOT_FOUND_OR_ALREADY_DECIDED' using errcode = 'P0002';
  end if;

  if not p_approve then
    if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
      raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22004';
    end if;
    update event_change_requests
    set status = 'REJECTED', approved_by = auth.uid(), approved_at = now(), rejection_reason = p_rejection_reason
    where id = p_request_id
    returning * into v_req;
    return v_req;
  end if;

  execute format('update events set %I = $1, updated_at = now(), updated_by = $2 where id = $3', v_req.field_name)
    using
      case v_req.field_name
        when 'participant_count' then v_req.new_value::int
        else v_req.new_value
      end,
    auth.uid(),
    v_req.event_id;

  select * into v_event from events where id = v_req.event_id;

  if v_req.field_name in ('start_date', 'end_date') then
    update trainer_assignments set status = 'ASSIGNED'
    where event_id = v_req.event_id and status = 'CONFIRMED';
    update venue_bookings set status = 'BOOKED'
    where event_id = v_req.event_id and status = 'CONFIRMED';
  end if;

  update event_change_requests
  set status = 'APPROVED', approved_by = auth.uid(), approved_at = now()
  where id = p_request_id
  returning * into v_req;

  v_link := '/events/' || v_req.event_id;
  perform create_notification(v_event.sales_user_id, 'CHANGE_REQUEST_APPROVED',
    'Perubahan ' || v_req.field_name || ' disetujui: ' || coalesce(v_event.event_code, v_event.event_name),
    v_req.old_value || ' → ' || v_req.new_value, 'event', v_req.event_id, v_link, 'HIGH');
  perform create_notification(v_event.pic_user_id, 'CHANGE_REQUEST_APPROVED',
    'Perubahan ' || v_req.field_name || ' disetujui: ' || coalesce(v_event.event_code, v_event.event_name),
    v_req.old_value || ' → ' || v_req.new_value, 'event', v_req.event_id, v_link, 'HIGH');

  return v_req;
end;
$$;

grant execute on function apply_change_request(uuid, boolean, text) to authenticated;
revoke execute on function apply_change_request(uuid, boolean, text) from public, anon;

alter table event_change_requests enable row level security;
create policy event_change_requests_select on event_change_requests for select to authenticated
  using (exists (select 1 from events e where e.id = event_change_requests.event_id));
create policy event_change_requests_insert on event_change_requests for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and exists (select 1 from events e where e.id = event_change_requests.event_id)
  );
create policy event_change_requests_update on event_change_requests for update to authenticated
  using (public.has_any_role('OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS_MANAGER','ADMIN'));
