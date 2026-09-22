-- Phase 3 Stage A — Financial master data: cost categories, vendors, and
-- the approval-threshold table that resolves "which role must approve this
-- amount" for both budgets and expenses (§14.1, §14.7, §38.2 D10/D11).
-- Thresholds are intentionally data, not code, per PRD's own instruction
-- that approval amounts must be configurable without a deployment.

alter table companies add column settings jsonb not null default '{}'::jsonb;
comment on column companies.settings is
  'Small scalar config that does not warrant its own table: expense_receipt_required_above, budget_required_above (both numeric IDR thresholds).';

create type approval_context as enum ('EXPENSE', 'BUDGET');

create table cost_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz,
  unique (company_id, code)
);

create trigger trg_cost_categories_updated_at
  before update on cost_categories
  for each row execute function set_updated_at();

create table vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  name text not null,
  category text,
  contact_name text,
  phone text,
  email text,
  npwp text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz
);

create trigger trg_vendors_updated_at
  before update on vendors
  for each row execute function set_updated_at();

create table approval_thresholds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  context approval_context not null,
  min_amount numeric(18,2) not null default 0,
  max_amount numeric(18,2),
  approver_role text not null references roles(name),
  sort_order int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  constraint chk_approval_thresholds_range check (max_amount is null or max_amount > min_amount)
);

create trigger trg_approval_thresholds_updated_at
  before update on approval_thresholds
  for each row execute function set_updated_at();

create index idx_approval_thresholds_lookup on approval_thresholds(company_id, context, sort_order);

-- ---------- RLS ----------
alter table cost_categories enable row level security;
create policy cost_categories_select on cost_categories for select to authenticated using (deleted_at is null);
create policy cost_categories_write on cost_categories for all to authenticated
  using (public.has_any_role('FINANCE','ADMIN'))
  with check (public.has_any_role('FINANCE','ADMIN'));

alter table vendors enable row level security;
create policy vendors_select on vendors for select to authenticated using (deleted_at is null);
create policy vendors_write on vendors for all to authenticated
  using (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','FINANCE','ADMIN'))
  with check (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','FINANCE','ADMIN'));

alter table approval_thresholds enable row level security;
create policy approval_thresholds_select on approval_thresholds for select to authenticated using (true);
create policy approval_thresholds_write on approval_thresholds for all to authenticated
  using (public.has_any_role('FINANCE','ADMIN'))
  with check (public.has_any_role('FINANCE','ADMIN'));

-- ---------- Seed (per company that already exists) ----------
-- §14.1 starter cost category list.
insert into cost_categories (company_id, code, name, sort_order)
select c.id, v.code, v.name, v.sort_order
from companies c
cross join (values
  ('TRAINER_FEE', 'Trainer Fee', 10),
  ('TRAINER_TRANSPORT', 'Trainer Transport', 20),
  ('TRAINER_ACCOMMODATION', 'Trainer Accommodation', 30),
  ('VENUE', 'Venue', 40),
  ('CATERING', 'Catering', 50),
  ('EQUIPMENT_RENTAL', 'Equipment Rental', 60),
  ('MATERIAL_PRINTING', 'Material Printing', 70),
  ('CERTIFICATE', 'Certificate', 80),
  ('ASSESSMENT_FEE', 'Assessment Fee', 90),
  ('LOGISTIC', 'Logistic', 100),
  ('DOCUMENTATION', 'Documentation', 110),
  ('MARKETING', 'Marketing', 120),
  ('ENTERTAINMENT', 'Entertainment', 130),
  ('OTHER', 'Other', 140)
) as v(code, name, sort_order)
where c.deleted_at is null;

-- §14.7 [ASSUMPTION] expense approval tiers, plus a BUDGET tier pair for D10
-- (Finance normally, Management above the same ceiling as an initial guess
-- — both explicitly flagged to the user as assumptions to confirm).
insert into approval_thresholds (company_id, context, min_amount, max_amount, approver_role, sort_order)
select c.id, v.context, v.min_amount, v.max_amount, v.approver_role, v.sort_order
from companies c
cross join (values
  ('EXPENSE'::approval_context, 0::numeric,          1000000::numeric, 'OPERATIONS',         1),
  ('EXPENSE'::approval_context, 1000000::numeric,     5000000::numeric, 'OPERATIONS_MANAGER',  2),
  ('EXPENSE'::approval_context, 5000000::numeric,    15000000::numeric, 'FINANCE',             3),
  ('EXPENSE'::approval_context, 15000000::numeric,    null,             'MANAGEMENT',          4),
  ('BUDGET'::approval_context,  0::numeric,          15000000::numeric, 'FINANCE',             1),
  ('BUDGET'::approval_context,  15000000::numeric,    null,             'MANAGEMENT',          2)
) as v(context, min_amount, max_amount, approver_role, sort_order)
where c.deleted_at is null;
