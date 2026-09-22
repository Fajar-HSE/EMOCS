-- Stage 1: notifications, notification_deliveries, audit_logs.
-- PRD refs: §22.3, §24.3, §29.2

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  link_url text,
  priority notification_priority not null default 'MEDIUM',
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_unread on notifications(recipient_user_id, created_at desc)
  where is_read = false;

create table notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references notifications(id) on delete cascade,
  channel notification_channel not null,
  status notification_delivery_status not null default 'PENDING',
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index idx_notification_deliveries_notification_id on notification_deliveries(notification_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  table_name text not null,
  record_id uuid,
  action text not null,
  actor_user_id uuid,
  actor_email text,
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_record on audit_logs(table_name, record_id, created_at desc);
create index idx_audit_logs_actor on audit_logs(actor_user_id, created_at desc);
