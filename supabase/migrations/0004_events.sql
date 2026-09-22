-- Stage 1: events table (core entity) + Event ID generator.
-- PRD refs: §12.2.3 (fields), §12.2.4 (Event ID), §24.3 (schema), §18.1 (business rules)

create table event_number_counters (
  year int primary key,
  last_number int not null default 0
);

create or replace function generate_event_code() returns text
language plpgsql security definer as $$
declare y int := extract(year from now() at time zone 'Asia/Jakarta');
        n int;
begin
  insert into event_number_counters(year, last_number) values (y, 1)
  on conflict (year) do update set last_number = event_number_counters.last_number + 1
  returning last_number into n;
  return 'EVT-' || y || '-' || lpad(n::text, 6, '0');
end $$;

create table events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  event_code text unique,
  event_name text not null,
  customer_id uuid not null references customers(id) on delete restrict,
  contact_id uuid references customer_contacts(id) on delete restrict,
  training_id uuid not null references trainings(id) on delete restrict,
  city_id uuid references cities(id) on delete restrict,
  event_type event_type not null,
  delivery_mode delivery_mode not null,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  duration_days int,
  location_type location_type,
  location_name text,
  participant_count int,
  sales_value numeric(18,2),
  po_status po_status not null default 'NO_PO',
  po_number text,
  payment_term payment_term,
  customer_reference text,
  description text,
  special_requirements text,
  sales_user_id uuid not null references profiles(id) on delete restrict,
  sales_team_id uuid references teams(id) on delete set null,
  pic_user_id uuid references profiles(id) on delete restrict,
  backup_pic_user_id uuid references profiles(id) on delete restrict,
  pic_assigned_at timestamptz,
  pic_assigned_by uuid references profiles(id),
  responsibility_note text,
  status event_status not null default 'DRAFT',
  priority event_priority not null default 'NORMAL',
  is_rush boolean not null default false,
  possible_duplicate boolean not null default false,
  progress_percentage int not null default 0,
  cancellation_reason text,
  cancellation_category cancellation_category,
  revision_note text,
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz,

  constraint chk_events_end_after_start check (end_date is null or start_date is null or end_date >= start_date),
  constraint chk_events_participant_count check (participant_count is null or (participant_count > 0 and participant_count <= 1000)),
  constraint chk_events_backup_pic_distinct check (backup_pic_user_id is null or backup_pic_user_id <> pic_user_id),
  constraint chk_events_po_number_required check (po_status <> 'PO_RECEIVED' or po_number is not null),
  constraint chk_events_pic_required_from_pic_assigned check (
    status not in ('PIC_ASSIGNED','PREPARATION','READY','RUNNING','COMPLETED','POST_EVENT','FINANCIAL_CLOSING','CLOSED')
    or pic_user_id is not null
  ),
  constraint chk_events_cancelled_reason check (
    status <> 'CANCELLED' or (cancellation_reason is not null and cancellation_category is not null)
  ),
  constraint chk_events_rejected_reason check (status <> 'REJECTED' or rejection_reason is not null),
  constraint chk_events_revision_note check (status <> 'REVISION_REQUESTED' or revision_note is not null)
);

create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();

create index idx_events_status on events(status);
create index idx_events_start_date on events(start_date);
create index idx_events_sales_user_id on events(sales_user_id, status);
create index idx_events_pic_user_id on events(pic_user_id, status);
create index idx_events_customer_id on events(customer_id);
create index idx_events_training_id on events(training_id);
create index idx_events_city_id on events(city_id);
create index idx_events_company_id on events(company_id, status, start_date);
create index idx_events_search on events using gin (
  to_tsvector('simple', coalesce(event_name, '') || ' ' || coalesce(event_code, ''))
);
