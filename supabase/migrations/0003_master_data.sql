-- Stage 1: Master Data (M3, FR-MD-01..03) — customers, contacts, trainings, cities.

create extension if not exists pg_trgm;

create table cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  deleted_at timestamptz,
  unique (name, province)
);

create table trainings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  code text not null,
  name text not null,
  category text,
  standard_duration_days int,
  has_certification boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz,
  unique (company_id, code)
);

create trigger trg_trainings_updated_at
  before update on trainings
  for each row execute function set_updated_at();

create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  name text not null,
  npwp text,
  industry text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz
);

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

create index idx_customers_name_trgm on customers using gin (name gin_trgm_ops);

create table customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  full_name text not null,
  job_title text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz
);

create trigger trg_customer_contacts_updated_at
  before update on customer_contacts
  for each row execute function set_updated_at();

create index idx_customer_contacts_customer_id on customer_contacts(customer_id);

-- BR-SYS-07: master data used by a transaction cannot be hard/soft deleted.
create or replace function guard_master_data_in_use()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    if TG_TABLE_NAME = 'customers' and exists (select 1 from events where customer_id = old.id and deleted_at is null) then
      raise exception 'CUSTOMER_IN_USE: cannot deactivate a customer with existing events';
    end if;
    if TG_TABLE_NAME = 'trainings' and exists (select 1 from events where training_id = old.id and deleted_at is null) then
      raise exception 'TRAINING_IN_USE: cannot deactivate a training with existing events';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_customers_in_use
  before update on customers
  for each row execute function guard_master_data_in_use();

create trigger trg_guard_trainings_in_use
  before update on trainings
  for each row execute function guard_master_data_in_use();
