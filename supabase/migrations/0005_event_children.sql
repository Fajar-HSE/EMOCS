-- Stage 1: event_status_history, event_tasks, event_comments, attachments.
-- PRD refs: §24.3, §12.2.7 (task), §18.2 (task rules)

create table event_status_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  from_status event_status,
  to_status event_status not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now(),
  reason text,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_event_status_history_event_id on event_status_history(event_id, changed_at desc);

create table event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text,
  assignee_user_id uuid not null references profiles(id) on delete restrict,
  due_date date not null,
  priority task_priority not null default 'NORMAL',
  status task_status not null default 'TODO',
  is_mandatory boolean not null default false,
  blocked_reason text,
  completed_at timestamptz,
  completed_by uuid references profiles(id),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  deleted_at timestamptz,

  constraint chk_event_tasks_blocked_reason check (status <> 'BLOCKED' or blocked_reason is not null)
);

create trigger trg_event_tasks_updated_at
  before update on event_tasks
  for each row execute function set_updated_at();

create index idx_event_tasks_event_id on event_tasks(event_id);
create index idx_event_tasks_assignee on event_tasks(assignee_user_id, status);
create index idx_event_tasks_overdue on event_tasks(due_date)
  where status not in ('DONE', 'CANCELLED');

-- SHOULD HAVE S1/S2, schema included from Phase 1 per PRD §24.1 so the
-- entity list matches, even though the UI ships slightly after MVP go-live.
create table event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_event_comments_event_id on event_comments(event_id, created_at desc);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  uploaded_by uuid not null references profiles(id) on delete restrict,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_attachments_event_id on attachments(event_id);
