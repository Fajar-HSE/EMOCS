-- Phase 3 Stage E — Financial Closing (§14.6, §14.8, BR-FIN-08/09/10/12).
-- `apply_financial_closing()` follows the same wrapper pattern as
-- `assign_pic()`: do the closing-specific work (prerequisite checks,
-- snapshot, margin banding), then call transition_event_status(id,'CLOSED')
-- at the end rather than adding a special-cased branch to that generic
-- function. `financial_closings` may accumulate multiple rows per event
-- (close -> reopen -> close again = a new row, never overwritten), matching
-- D21's "cancellation-style data is kept forever" principle.

create type margin_health_band as enum ('GREEN','YELLOW','RED','NEGATIVE');

create table financial_closings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  revenue_recognized numeric(18,2) not null,
  actual_cost numeric(18,2) not null,
  gross_profit numeric(18,2) not null,
  gross_margin_pct numeric(7,2),
  margin_health margin_health_band,
  negative_margin_explanation text,
  closed_by uuid not null references profiles(id),
  closed_at timestamptz not null default now(),
  reopened_by uuid references profiles(id),
  reopened_at timestamptz,
  reopened_reason text
);
create index idx_financial_closings_event on financial_closings(event_id, closed_at desc);

alter table financial_closings enable row level security;
create policy financial_closings_select on financial_closings for select to authenticated
  using (can_view_event_financials(event_id));

create or replace function apply_financial_closing(p_event_id uuid, p_negative_margin_explanation text default null)
returns financial_closings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
  v_costs record;
  v_revenue numeric;
  v_actual_cost numeric;
  v_gross_profit numeric;
  v_gross_margin_pct numeric;
  v_margin_health margin_health_band;
  v_closing financial_closings;
  v_pending_count int;
  v_missing_docs int;
begin
  select * into v_event from events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.has_any_role('FINANCE','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_event.status <> 'FINANCIAL_CLOSING' then
    raise exception 'EVENT_NOT_IN_FINANCIAL_CLOSING' using errcode = '22023';
  end if;

  -- BR-FIN-11: by the time an event reaches FINANCIAL_CLOSING it has already
  -- passed through COMPLETED, so this should always be populated — checked
  -- defensively rather than assumed.
  if v_event.revenue_recognized_amount is null then
    raise exception 'REVENUE_NOT_RECORDED' using errcode = '22023';
  end if;

  -- BR-FIN-08: no expense still awaiting a decision.
  select count(*) into v_pending_count from expenses
    where event_id = p_event_id and status in ('SUBMITTED','UNDER_REVIEW');
  if v_pending_count > 0 then
    raise exception 'PENDING_EXPENSES_EXIST' using errcode = '22023';
  end if;

  -- BR-FIN-08: every mandatory document verified. Invoice timing is left as
  -- informational-only for this version (PRD marks it [OPEN QUESTION]; the
  -- checks above are already the strict, unambiguous ones).
  select count(*) into v_missing_docs from documents
    where event_id = p_event_id and is_mandatory and verification_status <> 'VERIFIED' and deleted_at is null;
  if v_missing_docs > 0 then
    raise exception 'MANDATORY_DOCUMENTS_NOT_VERIFIED' using errcode = '22023';
  end if;

  select * into v_costs from compute_event_costs(p_event_id);

  v_revenue := v_event.revenue_recognized_amount;
  v_actual_cost := v_costs.actual_cost;
  v_gross_profit := v_revenue - v_actual_cost;
  v_gross_margin_pct := case when v_revenue > 0 then v_gross_profit / v_revenue * 100 else null end;

  -- BR-FIN-12: a negative margin must be explained in writing to close.
  if v_gross_profit < 0 and (p_negative_margin_explanation is null or length(trim(p_negative_margin_explanation)) = 0) then
    raise exception 'NEGATIVE_MARGIN_EXPLANATION_REQUIRED' using errcode = '22004';
  end if;

  -- §14.6 margin health bands (Phase 0 assumption): green >=40%, yellow
  -- 25-40%, red <25%, negative <0% (checked first so it always wins even
  -- if the percentage math would otherwise land it in "red").
  v_margin_health := case
    when v_gross_profit < 0 then 'NEGATIVE'
    when v_gross_margin_pct is null then null -- zero revenue and zero cost: nothing to rate
    when v_gross_margin_pct >= 40 then 'GREEN'
    when v_gross_margin_pct >= 25 then 'YELLOW'
    else 'RED'
  end;

  insert into financial_closings (
    event_id, revenue_recognized, actual_cost, gross_profit, gross_margin_pct,
    margin_health, negative_margin_explanation, closed_by
  ) values (
    p_event_id, v_revenue, v_actual_cost, v_gross_profit, v_gross_margin_pct,
    v_margin_health, p_negative_margin_explanation, auth.uid()
  )
  returning * into v_closing;

  perform transition_event_status(p_event_id, 'CLOSED');

  return v_closing;
end;
$$;

grant execute on function apply_financial_closing(uuid, text) to authenticated;
revoke execute on function apply_financial_closing(uuid, text) from public, anon;

-- ---------- transition_event_status(): reopen-stamp on financial_closings ----------
-- Extracted verbatim from 0028_phase3_revenue.sql before editing (anti-
-- regression discipline). Only addition: when the reopen branch actually
-- succeeds (v_is_reopen, i.e. CLOSED -> anything), stamp the most recent
-- not-yet-reopened financial_closings row for this event with who/when/why
-- (BR-FIN-10). The row itself is never deleted or overwritten otherwise —
-- closing again afterwards inserts a brand new row.

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
    -- BR-FIN-11: revenue is recognized once, at COMPLETED, and never
    -- recomputed afterwards (frozen) even if participant billing changes.
    revenue_recognized_amount = case when p_to_status = 'COMPLETED' then compute_event_revenue(p_event_id, true) else revenue_recognized_amount end,
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_event_id
  returning * into v_event;

  if p_to_status = 'CANCELLED' then
    update event_tasks set status = 'CANCELLED', updated_at = now(), updated_by = auth.uid()
    where event_id = p_event_id and status not in ('DONE','CANCELLED');
  end if;

  -- BR-FIN-10: reopening a CLOSED event must be traceable to who/when/why,
  -- stamped onto the closing record it's reopening (the most recent one not
  -- already reopened) rather than only living in event_status_history.
  if v_is_reopen then
    update financial_closings
    set reopened_by = auth.uid(), reopened_at = now(), reopened_reason = p_reason
    where id = (
      select id from financial_closings
      where event_id = p_event_id and reopened_at is null
      order by closed_at desc
      limit 1
    );
  end if;

  insert into event_status_history(event_id, from_status, to_status, changed_by, reason, metadata)
  values (p_event_id, v_from_status, p_to_status, auth.uid(), p_reason, p_metadata);

  perform notify_event_status_change(v_event, v_from_status, p_to_status, p_reason);

  return v_event;
end;
$$;

grant execute on function transition_event_status(uuid, event_status, text, cancellation_category, jsonb) to authenticated;
revoke execute on function transition_event_status(uuid, event_status, text, cancellation_category, jsonb) from public, anon;
