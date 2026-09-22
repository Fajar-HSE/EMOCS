-- Phase 2 §13.1-13.3: Trainer, Venue, Equipment master data + per-event
-- assignments. Conflict detection (BR-TRN-01, BR-VEN-01, BR-EQP-01) is a
-- soft warning overridable by Ops Manager (PRD: "peringatan keras, dapat
-- ditimpa"), so it lives in the Server Action layer, not a hard DB
-- constraint — the query it needs is simple and cheap to run there.

create type trainer_type as enum ('INTERNAL', 'ASSOCIATE', 'FREELANCE');
create type trainer_assignment_role as enum ('MAIN', 'CO_TRAINER', 'ASSESSOR', 'BACKUP');
create type trainer_assignment_status as enum ('REQUESTED', 'AVAILABLE', 'ASSIGNED', 'CONFIRMED', 'CANCELLED', 'REPLACED');
create type venue_booking_status as enum ('INQUIRY', 'HOLD', 'BOOKED', 'CONFIRMED', 'CANCELLED');
create type equipment_assignment_status as enum ('PLANNED', 'PREPARED', 'IN_USE', 'RETURNED');

create table trainers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  full_name text not null,
  trainer_type trainer_type not null default 'FREELANCE',
  city_id uuid references cities(id) on delete set null,
  phone text,
  email text,
  rate_card numeric(18,2),
  rating numeric(3,2),
  certification_name text,
  certification_expires_at date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz
);
create trigger trg_trainers_updated_at before update on trainers for each row execute function set_updated_at();
create trigger trg_audit_trainers after insert or update or delete on trainers for each row execute function fn_audit();

create table trainer_specialties (
  trainer_id uuid not null references trainers(id) on delete cascade,
  training_id uuid not null references trainings(id) on delete cascade,
  primary key (trainer_id, training_id)
);

create table trainer_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  trainer_id uuid not null references trainers(id) on delete restrict,
  role trainer_assignment_role not null default 'MAIN',
  assignment_date_start date,
  assignment_date_end date,
  fee numeric(18,2),
  status trainer_assignment_status not null default 'REQUESTED',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz
);
create trigger trg_trainer_assignments_updated_at before update on trainer_assignments for each row execute function set_updated_at();
create trigger trg_audit_trainer_assignments after insert or update or delete on trainer_assignments for each row execute function fn_audit();
create index idx_trainer_assignments_event on trainer_assignments(event_id);
create index idx_trainer_assignments_trainer on trainer_assignments(trainer_id, status);

create table venues (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  name text not null,
  venue_type text,
  address text,
  city_id uuid references cities(id) on delete set null,
  capacity int,
  contact_name text,
  contact_phone text,
  reference_price numeric(18,2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz
);
create trigger trg_venues_updated_at before update on venues for each row execute function set_updated_at();
create trigger trg_audit_venues after insert or update or delete on venues for each row execute function fn_audit();

create table venue_bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete restrict,
  status venue_booking_status not null default 'INQUIRY',
  estimated_cost numeric(18,2),
  confirmation_number text,
  cancellation_policy text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz
);
create trigger trg_venue_bookings_updated_at before update on venue_bookings for each row execute function set_updated_at();
create trigger trg_audit_venue_bookings after insert or update or delete on venue_bookings for each row execute function fn_audit();
create index idx_venue_bookings_event on venue_bookings(event_id);
create index idx_venue_bookings_venue on venue_bookings(venue_id, status);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  name text not null,
  category text,
  total_quantity int not null default 1,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz
);
create trigger trg_equipment_updated_at before update on equipment for each row execute function set_updated_at();
create trigger trg_audit_equipment after insert or update or delete on equipment for each row execute function fn_audit();

create table equipment_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete restrict,
  quantity int not null default 1,
  status equipment_assignment_status not null default 'PLANNED',
  condition_on_return text,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz,
  constraint chk_equipment_assignments_qty check (quantity > 0)
);
create trigger trg_equipment_assignments_updated_at before update on equipment_assignments for each row execute function set_updated_at();
create trigger trg_audit_equipment_assignments after insert or update or delete on equipment_assignments for each row execute function fn_audit();
create index idx_equipment_assignments_event on equipment_assignments(event_id);
create index idx_equipment_assignments_equipment on equipment_assignments(equipment_id, status);

-- ---------- RLS ----------
alter table trainers enable row level security;
create policy trainers_select on trainers for select to authenticated using (deleted_at is null);
create policy trainers_write on trainers for all to authenticated
  using (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'));

alter table trainer_specialties enable row level security;
create policy trainer_specialties_select on trainer_specialties for select to authenticated using (true);
create policy trainer_specialties_write on trainer_specialties for all to authenticated
  using (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'));

alter table trainer_assignments enable row level security;
create policy trainer_assignments_select on trainer_assignments for select to authenticated
  using (exists (select 1 from events e where e.id = trainer_assignments.event_id));
create policy trainer_assignments_write on trainer_assignments for all to authenticated
  using (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'));

alter table venues enable row level security;
create policy venues_select on venues for select to authenticated using (deleted_at is null);
create policy venues_write on venues for all to authenticated
  using (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'));

alter table venue_bookings enable row level security;
create policy venue_bookings_select on venue_bookings for select to authenticated
  using (exists (select 1 from events e where e.id = venue_bookings.event_id));
create policy venue_bookings_write on venue_bookings for all to authenticated
  using (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'));

alter table equipment enable row level security;
create policy equipment_select on equipment for select to authenticated using (deleted_at is null);
create policy equipment_write on equipment for all to authenticated
  using (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'));

alter table equipment_assignments enable row level security;
create policy equipment_assignments_select on equipment_assignments for select to authenticated
  using (exists (select 1 from events e where e.id = equipment_assignments.event_id));
create policy equipment_assignments_write on equipment_assignments for all to authenticated
  using (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS','OPERATIONS_MANAGER','ADMIN'));
