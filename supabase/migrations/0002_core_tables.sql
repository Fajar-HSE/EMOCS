-- Stage 1: companies, teams, roles/permissions, profiles, invited_emails.
-- PRD refs: §7 (roles), §24.1, §24.3 (profiles), §12.2.1-12.2.2 (auth/invite)

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

create table teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_teams_updated_at
  before update on teams
  for each row execute function set_updated_at();

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- profiles extends auth.users (PRD §24.3)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete restrict,
  full_name text not null,
  email text not null unique,
  phone text,
  team_id uuid references teams(id) on delete set null,
  job_title text,
  avatar_url text,
  is_active boolean not null default true,
  notification_prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create table user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references profiles(id),
  primary key (user_id, role_id)
);

-- Invite-only gate (PRD §12.2.1 "Invite-only: Ya"): an Admin invite action
-- inserts a row here (via Server Action, using the Auth Admin API to send
-- the actual invite email); handle_new_user() consumes it on first sign-in.
-- If no matching row exists, no profile/roles are created for the new
-- auth.users row and the app's DAL (lib/auth/session.ts) treats that user as
-- unauthenticated — see 0007_functions_triggers.sql.
create table invited_emails (
  email text primary key,
  full_name text,
  team_id uuid references teams(id) on delete set null,
  roles text[] not null default '{}',
  invited_by uuid references profiles(id),
  invited_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index idx_user_roles_role_id on user_roles(role_id);
create index idx_profiles_team_id on profiles(team_id);
create index idx_profiles_company_id on profiles(company_id);

insert into roles (name, description) values
  ('ADMIN', 'Administrator sistem'),
  ('SALES', 'Sales'),
  ('SALES_MANAGER', 'Sales Manager'),
  ('OPERATIONS', 'PIC Operations'),
  ('OPERATIONS_MANAGER', 'Operations Manager'),
  ('FINANCE', 'Finance (Phase 3, non-aktif di Phase 1)'),
  ('MANAGEMENT', 'Management');
