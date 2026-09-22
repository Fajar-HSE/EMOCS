-- Hotfix for apply_change_request(): the original CASE expression tried to
-- unify a text branch (v_req.new_value) with an int branch
-- (v_req.new_value::int) in the same `execute ... using` argument list.
-- Postgres requires all CASE branches to resolve to one common type at
-- parse time, so this raised "CASE types text and integer cannot be
-- matched" on every approval — caught only now that the Change Request UI
-- actually exercises this function for the first time. Fixed by splitting
-- into two separate execute/using statements, each with one consistent
-- parameter type, instead of one CASE trying to produce either type.
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

  if v_req.field_name = 'participant_count' then
    execute format('update events set %I = $1, updated_at = now(), updated_by = $2 where id = $3', v_req.field_name)
      using v_req.new_value::int, auth.uid(), v_req.event_id;
  else
    execute format('update events set %I = $1, updated_at = now(), updated_by = $2 where id = $3', v_req.field_name)
      using v_req.new_value, auth.uid(), v_req.event_id;
  end if;

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
