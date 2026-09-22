-- Phase 3 Stage D — Revenue model (§14.3, §14.4, §14.5, BR-FIN-03/11, D14/D17).
-- Dual revenue recognition per the plan's decision #3: PUBLIC events (many
-- paying customers per event) recognize sum(participants.unit_price) where
-- billing_status='CONFIRMED'; every other event_type keeps using
-- events.sales_value, exactly like today. Revenue is frozen once at
-- COMPLETED (decision #4) — editing participant data afterwards must never
-- silently move a number Management already treats as final.

alter table events add column is_promotional boolean not null default false;
comment on column events.is_promotional is
  'D17/E25: gratis/promosi/CSR event, sales_value may be 0. Excluded from margin averages in reporting (Phase 3 dashboards / Phase 4 BI), not from the calculations themselves.';
alter table events add column revenue_recognized_amount numeric(18,2);
comment on column events.revenue_recognized_amount is
  'Null until the event reaches COMPLETED; frozen by transition_event_status() at that point (BR-FIN-11), never recomputed afterwards even if participant billing data changes later.';

create type participant_billing_status as enum ('CONFIRMED','CANCELLED','WAIVED');
create type participant_payment_status as enum ('UNPAID','INVOICED','PARTIAL','PAID');

alter table participants add column unit_price numeric(18,2);
alter table participants add column billing_status participant_billing_status not null default 'CONFIRMED';
alter table participants add column payment_status participant_payment_status not null default 'UNPAID';
alter table participants add column billing_customer_id uuid references customers(id) on delete set null;
comment on column participants.billing_customer_id is
  'Which company this specific participant is billed to for PUBLIC class events (many customers per event) — nullable because walk-in public-class registrants do not always have tidy customer master data yet.';

-- ---------- Shared financial-visibility gate (BR-FIN-15: enforced in the DB,
-- not the UI) ----------
-- Broader than events_select's general visibility (below): SALES/SALES_MANAGER
-- only ever see aggregates for events they actually own/manage here, never
-- "all events masked at the app layer" the way plain event browsing works.
create or replace function can_view_event_financials(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_any_role('ADMIN','MANAGEMENT','OPERATIONS_MANAGER','FINANCE')
    or exists (
      select 1 from events e
      where e.id = p_event_id
        and (
          (public.has_role('OPERATIONS') and (e.pic_user_id = auth.uid() or e.backup_pic_user_id = auth.uid()))
          or (public.has_role('SALES') and e.sales_user_id = auth.uid())
          or (public.has_role('SALES_MANAGER') and e.sales_team_id = (select team_id from profiles where id = auth.uid()))
        )
    );
$$;

-- FINANCE was never added to events_select's full-access branch back in
-- Phase 1 (the role existed but was "non-aktif" — see 0002's comment). Phase
-- 3 needs Finance to actually browse events for budget/expense/closing
-- screens, so this gap has to close now rather than silently blocking every
-- Finance-facing page with zero rows.
drop policy events_select on events;
create policy events_select on events for select to authenticated
  using (
    deleted_at is null
    and (
      public.has_any_role('ADMIN','MANAGEMENT','OPERATIONS_MANAGER','FINANCE')
      or (public.has_role('OPERATIONS') and (pic_user_id = (select auth.uid()) or backup_pic_user_id = (select auth.uid())))
      or public.has_role('SALES') -- D04: Sales may read ALL events, commercial fields masked in the app layer
      or (public.has_role('SALES_MANAGER') and sales_team_id = (select team_id from profiles where id = (select auth.uid())))
    )
  );

-- ---------- Revenue ----------

-- Two-arg form does the actual math with an explicit auth bypass flag, only
-- ever passed `true` by trusted internal callers (transition_event_status)
-- that already gated who's allowed to trigger this in the first place —
-- revoked from authenticated/anon so no client can reach it directly and
-- self-skip the check. The one-arg public form always enforces the gate.
create or replace function compute_event_revenue(p_event_id uuid, p_skip_auth boolean)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event events;
  v_revenue numeric;
begin
  select * into v_event from events where id = p_event_id;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not p_skip_auth and not can_view_event_financials(p_event_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_event.event_type = 'PUBLIC' then
    select coalesce(sum(unit_price), 0) into v_revenue
    from participants
    where event_id = p_event_id and billing_status = 'CONFIRMED' and deleted_at is null;
  else
    v_revenue := coalesce(v_event.sales_value, 0);
  end if;

  return v_revenue;
end;
$$;
revoke execute on function compute_event_revenue(uuid, boolean) from public, authenticated, anon;

create or replace function compute_event_revenue(p_event_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select compute_event_revenue(p_event_id, false);
$$;
grant execute on function compute_event_revenue(uuid) to authenticated;
revoke execute on function compute_event_revenue(uuid) from public, anon;

-- ---------- Costs (§14.3: three numbers side by side) ----------

create or replace function compute_event_costs(p_event_id uuid)
returns table(actual_cost numeric, pending_cost numeric, projected_cost numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from events where id = p_event_id) then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not can_view_event_financials(p_event_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select
    coalesce(sum(amount) filter (where status in ('APPROVED','PAID')), 0) as actual_cost,
    coalesce(sum(amount) filter (where status in ('SUBMITTED','UNDER_REVIEW')), 0) as pending_cost,
    coalesce(sum(amount) filter (where status in ('APPROVED','PAID','SUBMITTED','UNDER_REVIEW')), 0) as projected_cost
  from expenses
  where event_id = p_event_id;
end;
$$;
grant execute on function compute_event_costs(uuid) to authenticated;
revoke execute on function compute_event_costs(uuid) from public, anon;

-- ---------- Budget vs Actual, per category (§14.5) ----------

create or replace function compute_budget_variance(p_event_id uuid)
returns table(
  cost_category_id uuid,
  cost_category_name text,
  budgeted_amount numeric,
  actual_amount numeric,
  variance_amount numeric,
  variance_pct numeric,
  band text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event events;
  v_budget_id uuid;
begin
  select * into v_event from events where id = p_event_id;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not can_view_event_financials(p_event_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select id into v_budget_id from event_budgets where event_id = p_event_id and status = 'APPROVED';

  return query
  select
    cc.id,
    cc.name,
    coalesce(bi.planned_amount, 0),
    coalesce(ex.actual_amount, 0),
    coalesce(ex.actual_amount, 0) - coalesce(bi.planned_amount, 0),
    case when coalesce(bi.planned_amount, 0) > 0
      then (coalesce(ex.actual_amount, 0) - bi.planned_amount) / bi.planned_amount * 100
      else null
    end,
    case
      when coalesce(bi.planned_amount, 0) = 0 then 'NO_BUDGET'
      when (coalesce(ex.actual_amount, 0) - bi.planned_amount) / bi.planned_amount * 100 > 15 then 'ALERT'
      when (coalesce(ex.actual_amount, 0) - bi.planned_amount) / bi.planned_amount * 100 > 5 then 'OVER'
      when (coalesce(ex.actual_amount, 0) - bi.planned_amount) / bi.planned_amount * 100 >= -5 then 'ON_BUDGET'
      else 'UNDER'
    end
  from cost_categories cc
  left join event_budget_items bi on bi.event_budget_id = v_budget_id and bi.cost_category_id = cc.id
  left join (
    select ex_raw.cost_category_id, sum(ex_raw.amount) as actual_amount
    from expenses ex_raw
    where ex_raw.event_id = p_event_id and ex_raw.status in ('APPROVED','PAID')
    group by ex_raw.cost_category_id
  ) ex on ex.cost_category_id = cc.id
  where cc.company_id = v_event.company_id and (bi.id is not null or ex.actual_amount is not null)
  order by cc.sort_order;
end;
$$;
grant execute on function compute_budget_variance(uuid) to authenticated;
revoke execute on function compute_budget_variance(uuid) from public, anon;

-- ---------- transition_event_status(): freeze revenue at COMPLETED ----------
-- Extracted verbatim from 0014_hotfix_public_has_role.sql (the last known-
-- correct version) before editing, per this codebase's anti-regression
-- discipline — only one line added to the SET clause, everything else
-- byte-for-byte identical.

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

  insert into event_status_history(event_id, from_status, to_status, changed_by, reason, metadata)
  values (p_event_id, v_from_status, p_to_status, auth.uid(), p_reason, p_metadata);

  perform notify_event_status_change(v_event, v_from_status, p_to_status, p_reason);

  return v_event;
end;
$$;

grant execute on function transition_event_status(uuid, event_status, text, cancellation_category, jsonb) to authenticated;
revoke execute on function transition_event_status(uuid, event_status, text, cancellation_category, jsonb) from public, anon;
