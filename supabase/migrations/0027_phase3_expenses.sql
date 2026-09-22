-- Phase 3 Stage C — Expenses (§14.2, §14.3, §14.7, BR-FIN-01..08/14). Workflow
-- functions reuse Stage B's resolve_approval_tier()/resolve_approver_max_rank()
-- with context='EXPENSE' (same "resolve role approver from an amount" problem,
-- one mechanism per Stage A's design decision).
--
-- Reminder from Stage B's post-mortem (see PROJECT_STATUS.md §7): never guard
-- a composite/row variable with `is [not] null` — approval_thresholds rows have
-- nullable created_by/updated_by, so a mixed-null row makes both IS NULL and
-- IS NOT NULL false. Every such check below tests `v_tier.id is not null`.

create type expense_status as enum ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','PAID');
create type expense_payment_method as enum ('CASH_ADVANCE','REIMBURSEMENT','TRANSFER','COMPANY_CARD');

create table expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  cost_category_id uuid not null references cost_categories(id) on delete restrict,
  vendor_id uuid references vendors(id) on delete restrict,
  vendor_name text,
  description text not null,
  amount numeric(18,2) not null check (amount > 0),
  expense_date date not null,
  payment_method expense_payment_method not null,
  receipt_document_id uuid references documents(id) on delete set null,
  -- BR-FIN-14/§14.7: required when this cost category has no line item in the
  -- event's currently APPROVED budget ("expense di luar budget kategori").
  justification_note text,
  status expense_status not null default 'DRAFT',
  -- Frozen at submit time (see submit_expense) so a later edit to
  -- approval_thresholds never changes the requirement for an in-flight expense.
  required_approver_role text references roles(name),
  required_tier_rank int,
  submitted_by uuid references profiles(id),
  submitted_at timestamptz,
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  rejection_reason text,
  paid_by uuid references profiles(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);
create index idx_expenses_event_status on expenses(event_id, status);
create index idx_expenses_status_date on expenses(status, expense_date);

create trigger trg_expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at();
create trigger trg_audit_expenses after insert or update or delete on expenses
  for each row execute function fn_audit();

create table expense_status_history (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete restrict,
  from_status expense_status,
  to_status expense_status not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now(),
  reason text,
  metadata jsonb not null default '{}'::jsonb
);
create index idx_expense_status_history_expense_id on expense_status_history(expense_id, changed_at desc);

-- ---------- Guard triggers ----------

-- BR-FIN-07/E11: no new expense once the event is CLOSED (or CANCELLED,
-- matching guard_task_parent_event_state's existing scope). Reopening an
-- event (transition_event_status CLOSED -> FINANCIAL_CLOSING) lifts this
-- automatically since the guard only checks current status.
create or replace function guard_expense_event_state() returns trigger
language plpgsql
as $$
declare
  v_status event_status;
begin
  select status into v_status from events where id = NEW.event_id;
  if v_status in ('CLOSED','CANCELLED') then
    raise exception 'CANNOT_ADD_EXPENSE_TO_% EVENT', v_status using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_guard_expense_event_state
  before insert on expenses
  for each row execute function guard_expense_event_state();

-- BR-FIN-06: receipt required above companies.settings->>'expense_receipt_required_above'
-- (default Rp100.000, §14.2), enforced at the DRAFT -> SUBMITTED transition,
-- not at insert (a draft may be filled in over time before a receipt is attached).
create or replace function guard_expense_receipt_required() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold numeric;
begin
  if NEW.status = 'SUBMITTED' and OLD.status is distinct from 'SUBMITTED' then
    select coalesce((c.settings->>'expense_receipt_required_above')::numeric, 100000)
      into v_threshold
      from events e join companies c on c.id = e.company_id
      where e.id = NEW.event_id;
    if NEW.amount > v_threshold and NEW.receipt_document_id is null then
      raise exception 'RECEIPT_REQUIRED_ABOVE_THRESHOLD' using errcode = '22004';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_guard_expense_receipt_required
  before update on expenses
  for each row execute function guard_expense_receipt_required();

-- Close the gap flagged since Stage A's plan: deactivating a cost category
-- that budget items or expenses already reference would silently orphan
-- their category label. Hard delete was already blocked by `on delete
-- restrict`; this blocks the soft "is_active = false" path too.
create or replace function guard_cost_category_deactivation() returns trigger
language plpgsql
as $$
begin
  if NEW.is_active = false and OLD.is_active = true then
    if exists (select 1 from event_budget_items where cost_category_id = NEW.id)
       or exists (select 1 from expenses where cost_category_id = NEW.id) then
      raise exception 'COST_CATEGORY_IN_USE' using errcode = '23503';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_guard_cost_category_deactivation
  before update on cost_categories
  for each row execute function guard_cost_category_deactivation();

-- ---------- Workflow functions ----------

create or replace function submit_expense(p_expense_id uuid)
returns expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense expenses;
  v_event events;
  v_base_tier approval_thresholds;
  v_tier approval_thresholds;
  v_budget_id uuid;
  v_category_budget numeric := 0;
  v_category_used numeric := 0;
  v_variance_pct numeric;
  v_link text;
  v_approver record;
begin
  select * into v_expense from expenses where id = p_expense_id for update;
  if not found then
    raise exception 'EXPENSE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_expense.status <> 'DRAFT' then
    raise exception 'EXPENSE_NOT_DRAFT' using errcode = '22023';
  end if;

  select * into v_event from events where id = v_expense.event_id for update;
  if v_event.status in ('CLOSED','CANCELLED') then
    raise exception 'CANNOT_SUBMIT_EXPENSE_TO_% EVENT', v_event.status using errcode = '42501';
  end if;

  if not public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','FINANCE','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- BR-FIN-14: an expense that pushes its category >15% over the approved
  -- budget escalates one approval tier. Locking the event row (above) for
  -- the duration of this function serializes concurrent submits in the same
  -- event, so two simultaneous submissions can't both slip in under the
  -- 15% line by racing each other.
  select id into v_budget_id from event_budgets where event_id = v_expense.event_id and status = 'APPROVED';
  if v_budget_id is not null then
    select planned_amount into v_category_budget from event_budget_items
      where event_budget_id = v_budget_id and cost_category_id = v_expense.cost_category_id;
  end if;
  v_category_budget := coalesce(v_category_budget, 0);

  if v_category_budget = 0 and (v_expense.justification_note is null or length(trim(v_expense.justification_note)) = 0) then
    raise exception 'JUSTIFICATION_REQUIRED_OUT_OF_BUDGET' using errcode = '22004';
  end if;

  v_base_tier := resolve_approval_tier(v_event.company_id, 'EXPENSE', v_expense.amount);
  if v_base_tier.id is null then
    raise exception 'NO_APPROVAL_TIER_CONFIGURED' using errcode = '22023';
  end if;
  v_tier := v_base_tier;

  if v_category_budget > 0 then
    select coalesce(sum(amount), 0) into v_category_used from expenses
      where event_id = v_expense.event_id and cost_category_id = v_expense.cost_category_id
        and id <> p_expense_id and status in ('SUBMITTED','UNDER_REVIEW','APPROVED','PAID');
    v_variance_pct := (v_category_used + v_expense.amount - v_category_budget) / v_category_budget * 100;
    if v_variance_pct > 15 then
      select * into v_tier from approval_thresholds
        where company_id = v_event.company_id and context = 'EXPENSE' and is_active
          and sort_order > v_base_tier.sort_order
        order by sort_order asc limit 1;
      if v_tier.id is null then
        v_tier := v_base_tier; -- already at the highest tier
      end if;
    end if;
  end if;

  update expenses
  set status = 'SUBMITTED', submitted_by = auth.uid(), submitted_at = now(),
      required_approver_role = v_tier.approver_role, required_tier_rank = v_tier.sort_order,
      updated_at = now()
  where id = p_expense_id
  returning * into v_expense;

  insert into expense_status_history (expense_id, from_status, to_status, changed_by)
  values (p_expense_id, 'DRAFT', 'SUBMITTED', auth.uid());

  v_link := '/events/' || v_event.id;
  for v_approver in
    select p.id from profiles p
    join user_roles ur on ur.user_id = p.id
    join roles r on r.id = ur.role_id
    where r.name = v_tier.approver_role and p.is_active
  loop
    perform create_notification(v_approver.id, 'EXPENSE_SUBMITTED',
      'Expense menunggu persetujuan: ' || coalesce(v_event.event_code, v_event.event_name),
      v_expense.description || ' — Rp' || v_expense.amount::text, 'expense', v_expense.id, v_link, 'MEDIUM');
  end loop;

  return v_expense;
end;
$$;

grant execute on function submit_expense(uuid) to authenticated;
revoke execute on function submit_expense(uuid) from public, anon;

create or replace function mark_expense_under_review(p_expense_id uuid)
returns expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense expenses;
begin
  if not public.has_any_role('OPERATIONS_MANAGER','FINANCE','MANAGEMENT','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update expenses set status = 'UNDER_REVIEW', updated_at = now()
  where id = p_expense_id and status = 'SUBMITTED'
  returning * into v_expense;

  if not found then
    raise exception 'EXPENSE_NOT_FOUND_OR_NOT_SUBMITTED' using errcode = 'P0002';
  end if;

  insert into expense_status_history (expense_id, from_status, to_status, changed_by)
  values (p_expense_id, 'SUBMITTED', 'UNDER_REVIEW', auth.uid());

  return v_expense;
end;
$$;

grant execute on function mark_expense_under_review(uuid) to authenticated;
revoke execute on function mark_expense_under_review(uuid) from public, anon;

create or replace function decide_expense(p_expense_id uuid, p_approve boolean, p_rejection_reason text default null)
returns expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense expenses;
  v_event events;
  v_rank int;
  v_link text;
  v_budget_id uuid;
  v_category_budget numeric := 0;
  v_category_actual numeric := 0;
  v_variance_pct numeric;
  v_alert record;
begin
  select * into v_expense from expenses where id = p_expense_id and status in ('SUBMITTED','UNDER_REVIEW') for update;
  if not found then
    raise exception 'EXPENSE_NOT_FOUND_OR_ALREADY_DECIDED' using errcode = 'P0002';
  end if;

  -- BR-FIN-04/D12: independent of role, never the submitter.
  if v_expense.submitted_by = auth.uid() then
    raise exception 'CANNOT_APPROVE_OWN_SUBMISSION' using errcode = '42501';
  end if;

  select * into v_event from events where id = v_expense.event_id;

  if not public.has_role('ADMIN') then
    v_rank := resolve_approver_max_rank(auth.uid(), v_event.company_id, 'EXPENSE');
    if v_rank is null or v_rank < v_expense.required_tier_rank then
      raise exception 'INSUFFICIENT_APPROVAL_TIER' using errcode = '42501';
    end if;
  end if;

  v_link := '/events/' || v_event.id;

  if not p_approve then
    if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
      raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22004';
    end if;
    update expenses
    set status = 'REJECTED', decided_by = auth.uid(), decided_at = now(), rejection_reason = p_rejection_reason, updated_at = now()
    where id = p_expense_id
    returning * into v_expense;

    insert into expense_status_history (expense_id, from_status, to_status, changed_by, reason)
    values (p_expense_id, v_expense.status, 'REJECTED', auth.uid(), p_rejection_reason);

    perform create_notification(v_expense.submitted_by, 'EXPENSE_REJECTED',
      'Expense ditolak: ' || coalesce(v_event.event_code, v_event.event_name),
      p_rejection_reason, 'expense', v_expense.id, v_link, 'MEDIUM');
    return v_expense;
  end if;

  update expenses
  set status = 'APPROVED', decided_by = auth.uid(), decided_at = now(), updated_at = now()
  where id = p_expense_id
  returning * into v_expense;

  insert into expense_status_history (expense_id, from_status, to_status, changed_by)
  values (p_expense_id, v_expense.status, 'APPROVED', auth.uid());

  perform create_notification(v_expense.submitted_by, 'EXPENSE_APPROVED',
    'Expense disetujui: ' || coalesce(v_event.event_code, v_event.event_name),
    v_expense.description || ' — Rp' || v_expense.amount::text, 'expense', v_expense.id, v_link, 'MEDIUM');

  -- §14.5 variance alert: recompute actual (APPROVED+PAID only, BR-FIN-03)
  -- for this category now that this expense counts, independent of the
  -- one-tier escalation already applied (or not) at submit time.
  select id into v_budget_id from event_budgets where event_id = v_expense.event_id and status = 'APPROVED';
  v_category_budget := 0;
  if v_budget_id is not null then
    select coalesce(planned_amount, 0) into v_category_budget from event_budget_items
      where event_budget_id = v_budget_id and cost_category_id = v_expense.cost_category_id;
    v_category_budget := coalesce(v_category_budget, 0);
  end if;

  if v_category_budget > 0 then
    select coalesce(sum(amount), 0) into v_category_actual from expenses
      where event_id = v_expense.event_id and cost_category_id = v_expense.cost_category_id
        and status in ('APPROVED','PAID');
    v_variance_pct := (v_category_actual - v_category_budget) / v_category_budget * 100;
    if v_variance_pct > 15 then
      for v_alert in
        select p.id from profiles p
        join user_roles ur on ur.user_id = p.id
        join roles r on r.id = ur.role_id
        where r.name in ('OPERATIONS_MANAGER','FINANCE') and p.is_active
      loop
        perform create_notification(v_alert.id, 'BUDGET_VARIANCE_ALERT',
          'Kategori biaya melebihi budget >15%: ' || coalesce(v_event.event_code, v_event.event_name),
          'Actual Rp' || v_category_actual::text || ' vs budget Rp' || v_category_budget::text,
          'expense', v_expense.id, v_link, 'HIGH');
      end loop;
    end if;
  end if;

  return v_expense;
end;
$$;

grant execute on function decide_expense(uuid, boolean, text) to authenticated;
revoke execute on function decide_expense(uuid, boolean, text) from public, anon;

create or replace function mark_expense_paid(p_expense_id uuid)
returns expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense expenses;
begin
  if not public.has_any_role('FINANCE','ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update expenses set status = 'PAID', paid_by = auth.uid(), paid_at = now(), updated_at = now()
  where id = p_expense_id and status = 'APPROVED'
  returning * into v_expense;

  if not found then
    raise exception 'EXPENSE_NOT_FOUND_OR_NOT_APPROVED' using errcode = 'P0002';
  end if;

  insert into expense_status_history (expense_id, from_status, to_status, changed_by)
  values (p_expense_id, 'APPROVED', 'PAID', auth.uid());

  return v_expense;
end;
$$;

grant execute on function mark_expense_paid(uuid) to authenticated;
revoke execute on function mark_expense_paid(uuid) from public, anon;

-- ---------- RLS ----------
-- BR-FIN-15 + §23.2 "Sales tidak melihat rincian per expense, hanya total
-- (Stage D)": SALES/SALES_MANAGER get no direct access to this table at all.

alter table expenses enable row level security;
create policy expenses_select on expenses for select to authenticated
  using (
    public.has_any_role('OPERATIONS_MANAGER','FINANCE','MANAGEMENT','ADMIN')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = expenses.event_id
        and (e.pic_user_id = (select auth.uid()) or e.backup_pic_user_id = (select auth.uid()))
    ))
  );
create policy expenses_insert on expenses for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.has_any_role('OPERATIONS_MANAGER','FINANCE','ADMIN')
      or (
        public.has_role('OPERATIONS')
        and exists (
          select 1 from events e where e.id = expenses.event_id
            and (e.pic_user_id = (select auth.uid()) or e.backup_pic_user_id = (select auth.uid()))
        )
      )
    )
  );
create policy expenses_update on expenses for update to authenticated
  using (
    status = 'DRAFT'
    and (created_by = (select auth.uid()) or public.has_any_role('OPERATIONS_MANAGER','FINANCE','ADMIN'))
  )
  with check (
    status = 'DRAFT'
    and (created_by = (select auth.uid()) or public.has_any_role('OPERATIONS_MANAGER','FINANCE','ADMIN'))
  );
create policy expenses_delete on expenses for delete to authenticated
  using (status = 'DRAFT' and (created_by = (select auth.uid()) or public.has_any_role('OPERATIONS_MANAGER','FINANCE','ADMIN')));

alter table expense_status_history enable row level security;
create policy expense_status_history_select on expense_status_history for select to authenticated
  using (exists (select 1 from expenses ex where ex.id = expense_status_history.expense_id));
