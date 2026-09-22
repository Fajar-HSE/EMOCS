-- Phase 3 Stage B — Event Budgets (§14.1, §14.4, D10). A budget "version" is
-- a row, not a wrapper table: the same pattern already used for
-- `documents.version` (0019). Revising a budget = insert a new DRAFT row
-- (version auto-incremented by trigger), which later supersedes the
-- previously APPROVED row *at approval time*, not at creation time — so an
-- abandoned draft never disturbs the currently-approved budget.

create type event_budget_status as enum ('DRAFT','SUBMITTED','APPROVED','REJECTED','SUPERSEDED');

create table event_budgets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  version int not null,
  status event_budget_status not null default 'DRAFT',
  total_amount numeric(18,2) not null default 0,
  submitted_by uuid references profiles(id),
  submitted_at timestamptz,
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  unique (event_id, version)
);

-- Only one budget may be "in flight" (not yet decided) per event at a time,
-- and only one may be the currently-governing APPROVED version.
create unique index idx_event_budgets_one_in_flight on event_budgets(event_id)
  where status in ('DRAFT','SUBMITTED');
create unique index idx_event_budgets_one_approved on event_budgets(event_id)
  where status = 'APPROVED';

create trigger trg_event_budgets_updated_at
  before update on event_budgets
  for each row execute function set_updated_at();
create trigger trg_audit_event_budgets after insert or update or delete on event_budgets
  for each row execute function fn_audit();

-- Version is always server-assigned (next number for the event), and every
-- new row always starts life as a DRAFT regardless of what the client sends
-- — status only ever changes afterwards via submit_event_budget/decide_budget.
create or replace function trg_event_budgets_set_version() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  NEW.version := coalesce((select max(version) from event_budgets where event_id = NEW.event_id), 0) + 1;
  NEW.status := 'DRAFT';
  NEW.total_amount := 0;
  NEW.created_by := auth.uid();
  return NEW;
end;
$$;

create trigger trg_event_budgets_before_insert
  before insert on event_budgets
  for each row execute function trg_event_budgets_set_version();

create table event_budget_items (
  id uuid primary key default gen_random_uuid(),
  event_budget_id uuid not null references event_budgets(id) on delete cascade,
  cost_category_id uuid not null references cost_categories(id) on delete restrict,
  planned_amount numeric(18,2) not null check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  unique (event_budget_id, cost_category_id)
);
create index idx_event_budget_items_budget on event_budget_items(event_budget_id);
create trigger trg_audit_event_budget_items after insert or update or delete on event_budget_items
  for each row execute function fn_audit();

-- Keep event_budgets.total_amount as a live sum of its items — never trusted
-- from the client, always derived, so submit_event_budget can rely on it.
create or replace function trg_recompute_event_budget_total() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget_id uuid := coalesce(NEW.event_budget_id, OLD.event_budget_id);
begin
  update event_budgets set
    total_amount = coalesce((select sum(planned_amount) from event_budget_items where event_budget_id = v_budget_id), 0),
    updated_at = now()
  where id = v_budget_id;
  return null;
end;
$$;

create trigger trg_event_budget_items_recompute
  after insert or update or delete on event_budget_items
  for each row execute function trg_recompute_event_budget_total();

-- ---------- Shared approval-tier resolution (also used by Stage C expenses) ----------

-- Which threshold row governs an amount for a given company+context.
create or replace function resolve_approval_tier(p_company_id uuid, p_context approval_context, p_amount numeric)
returns approval_thresholds
language sql stable
security definer
set search_path = public
as $$
  select *
  from approval_thresholds
  where company_id = p_company_id
    and context = p_context
    and is_active
    and p_amount >= min_amount
    and (max_amount is null or p_amount < max_amount)
  order by sort_order asc
  limit 1;
$$;

-- Highest tier rank (sort_order) the given user qualifies for, based on
-- which of their roles appear as an approver_role in approval_thresholds.
-- Null means the user holds no role recognized as an approver for this context.
create or replace function resolve_approver_max_rank(p_user_id uuid, p_company_id uuid, p_context approval_context)
returns int
language sql stable
security definer
set search_path = public
as $$
  select max(at.sort_order)
  from approval_thresholds at
  join roles r on r.name = at.approver_role
  join user_roles ur on ur.role_id = r.id and ur.user_id = p_user_id
  where at.company_id = p_company_id
    and at.context = p_context
    and at.is_active;
$$;

-- ---------- Workflow functions ----------

create or replace function submit_event_budget(p_budget_id uuid)
returns event_budgets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget event_budgets;
  v_event events;
  v_tier approval_thresholds;
  v_approver record;
  v_link text;
begin
  select * into v_budget from event_budgets where id = p_budget_id for update;
  if not found then
    raise exception 'BUDGET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_budget.status <> 'DRAFT' then
    raise exception 'BUDGET_NOT_DRAFT' using errcode = '22023';
  end if;

  select * into v_event from events where id = v_budget.event_id;
  if not public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN')
     and v_event.pic_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (select 1 from event_budget_items where event_budget_id = p_budget_id) then
    raise exception 'BUDGET_HAS_NO_ITEMS' using errcode = '22023';
  end if;

  update event_budgets
  set status = 'SUBMITTED', submitted_by = auth.uid(), submitted_at = now(), updated_at = now()
  where id = p_budget_id
  returning * into v_budget;

  v_tier := resolve_approval_tier(v_event.company_id, 'BUDGET', v_budget.total_amount);
  v_link := '/events/' || v_event.id;

  -- Not `v_tier is not null`: approval_thresholds rows have nullable
  -- created_by/updated_by, and SQL composite NULL-ness requires *every*
  -- field to be null/non-null to match — a mixed row makes both `is null`
  -- and `is not null` false, silently skipping this block. `v_tier.id` is
  -- never null when a row was actually found, so it's the reliable check.
  if v_tier.id is not null then
    for v_approver in
      select p.id from profiles p
      join user_roles ur on ur.user_id = p.id
      join roles r on r.id = ur.role_id
      where r.name = v_tier.approver_role and p.is_active
    loop
      perform create_notification(v_approver.id, 'BUDGET_SUBMITTED',
        'Budget menunggu persetujuan: ' || coalesce(v_event.event_code, v_event.event_name),
        'Total Rp' || v_budget.total_amount::text, 'event_budget', v_budget.id, v_link, 'HIGH');
    end loop;
  end if;

  return v_budget;
end;
$$;

grant execute on function submit_event_budget(uuid) to authenticated;
revoke execute on function submit_event_budget(uuid) from public, anon;

create or replace function decide_budget(p_budget_id uuid, p_approve boolean, p_rejection_reason text default null)
returns event_budgets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget event_budgets;
  v_event events;
  v_tier approval_thresholds;
  v_rank int;
  v_link text;
begin
  select * into v_budget from event_budgets where id = p_budget_id and status = 'SUBMITTED' for update;
  if not found then
    raise exception 'BUDGET_NOT_FOUND_OR_ALREADY_DECIDED' using errcode = 'P0002';
  end if;

  if v_budget.submitted_by = auth.uid() then
    raise exception 'CANNOT_APPROVE_OWN_SUBMISSION' using errcode = '42501';
  end if;

  select * into v_event from events where id = v_budget.event_id;
  v_tier := resolve_approval_tier(v_event.company_id, 'BUDGET', v_budget.total_amount);

  if not public.has_role('ADMIN') then
    if v_tier is null then
      raise exception 'NO_APPROVAL_TIER_CONFIGURED' using errcode = '22023';
    end if;
    v_rank := resolve_approver_max_rank(auth.uid(), v_event.company_id, 'BUDGET');
    if v_rank is null or v_rank < v_tier.sort_order then
      raise exception 'INSUFFICIENT_APPROVAL_TIER' using errcode = '42501';
    end if;
  end if;

  v_link := '/events/' || v_event.id;

  if not p_approve then
    if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
      raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22004';
    end if;
    update event_budgets
    set status = 'REJECTED', decided_by = auth.uid(), decided_at = now(), rejection_reason = p_rejection_reason, updated_at = now()
    where id = p_budget_id
    returning * into v_budget;

    perform create_notification(v_budget.submitted_by, 'BUDGET_REJECTED',
      'Budget ditolak: ' || coalesce(v_event.event_code, v_event.event_name),
      p_rejection_reason, 'event_budget', v_budget.id, v_link, 'HIGH');
    return v_budget;
  end if;

  update event_budgets set status = 'SUPERSEDED', updated_at = now()
  where event_id = v_budget.event_id and status = 'APPROVED';

  update event_budgets
  set status = 'APPROVED', decided_by = auth.uid(), decided_at = now(), updated_at = now()
  where id = p_budget_id
  returning * into v_budget;

  perform create_notification(v_budget.submitted_by, 'BUDGET_APPROVED',
    'Budget disetujui: ' || coalesce(v_event.event_code, v_event.event_name),
    'Total Rp' || v_budget.total_amount::text, 'event_budget', v_budget.id, v_link, 'MEDIUM');

  return v_budget;
end;
$$;

grant execute on function decide_budget(uuid, boolean, text) to authenticated;
revoke execute on function decide_budget(uuid, boolean, text) from public, anon;

-- ---------- RLS ----------

alter table event_budgets enable row level security;
create policy event_budgets_select on event_budgets for select to authenticated
  using (exists (select 1 from events e where e.id = event_budgets.event_id));
create policy event_budgets_insert on event_budgets for insert to authenticated
  with check (
    exists (select 1 from events e where e.id = event_budgets.event_id)
    and (
      public.has_any_role('OPERATIONS_MANAGER','ADMIN')
      or (public.has_role('OPERATIONS') and exists (
        select 1 from events e where e.id = event_budgets.event_id and e.pic_user_id = (select auth.uid())
      ))
    )
  );
create policy event_budgets_delete on event_budgets for delete to authenticated
  using (status = 'DRAFT' and (created_by = (select auth.uid()) or public.has_any_role('OPERATIONS_MANAGER','ADMIN')));

alter table event_budget_items enable row level security;
create policy event_budget_items_select on event_budget_items for select to authenticated
  using (exists (select 1 from event_budgets b where b.id = event_budget_items.event_budget_id));
create policy event_budget_items_write on event_budget_items for all to authenticated
  using (
    exists (
      select 1 from event_budgets b
      where b.id = event_budget_items.event_budget_id and b.status = 'DRAFT'
      and (b.created_by = (select auth.uid()) or public.has_any_role('OPERATIONS_MANAGER','ADMIN'))
    )
  )
  with check (
    exists (
      select 1 from event_budgets b
      where b.id = event_budget_items.event_budget_id and b.status = 'DRAFT'
      and (b.created_by = (select auth.uid()) or public.has_any_role('OPERATIONS_MANAGER','ADMIN'))
    )
  );
