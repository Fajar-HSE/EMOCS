-- Phase 2 §13.4 Participant Management — personal data (UU PDP No. 27/2022).
-- BR-PAR-02: only the event's PIC, Ops Manager, and Admin may read detail
-- rows; Sales sees only a count via the events.participant_count column
-- they already have access to, never this table directly.

create table participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  full_name text not null,
  company_name text,
  job_title text,
  email text,
  phone text,
  nik text,
  registration_status text not null default 'REGISTERED',
  certificate_status text,
  certificate_number text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  deleted_at timestamptz
);
create index idx_participants_event on participants(event_id);
create trigger trg_audit_participants after insert or update or delete on participants for each row execute function fn_audit();

create table participant_attendance (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  attendance_date date not null,
  is_present boolean not null default false,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references profiles(id),
  unique (participant_id, attendance_date)
);

-- BR-PAR-03: every export of the participant list is logged. Called
-- explicitly by the export Server Action (not a trigger — SELECT isn't
-- something Postgres can hook generically the way it does INSERT/UPDATE).
create or replace function log_participant_export(p_event_id uuid, p_count int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (table_name, record_id, action, actor_user_id, new_values)
  values ('participants', p_event_id, 'EXPORT', auth.uid(), jsonb_build_object('event_id', p_event_id, 'row_count', p_count));
end;
$$;
grant execute on function log_participant_export(uuid, int) to authenticated;
revoke execute on function log_participant_export(uuid, int) from public, anon;

alter table participants enable row level security;
create policy participants_select on participants for select to authenticated
  using (
    deleted_at is null
    and (
      public.has_any_role('OPERATIONS_MANAGER','ADMIN')
      or (public.has_role('OPERATIONS') and exists (
        select 1 from events e where e.id = participants.event_id and e.pic_user_id = (select auth.uid())
      ))
    )
  );
create policy participants_write on participants for all to authenticated
  using (
    public.has_any_role('OPERATIONS_MANAGER','ADMIN')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = participants.event_id and e.pic_user_id = (select auth.uid())
    ))
  )
  with check (
    public.has_any_role('OPERATIONS_MANAGER','ADMIN')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = participants.event_id and e.pic_user_id = (select auth.uid())
    ))
  );

alter table participant_attendance enable row level security;
create policy participant_attendance_select on participant_attendance for select to authenticated
  using (exists (
    select 1 from participants p, events e
    where p.id = participant_attendance.participant_id and e.id = p.event_id
      and (
        public.has_any_role('OPERATIONS_MANAGER','ADMIN')
        or (public.has_role('OPERATIONS') and e.pic_user_id = (select auth.uid()))
      )
  ));
create policy participant_attendance_write on participant_attendance for all to authenticated
  using (exists (
    select 1 from participants p, events e
    where p.id = participant_attendance.participant_id and e.id = p.event_id
      and (
        public.has_any_role('OPERATIONS_MANAGER','ADMIN')
        or (public.has_role('OPERATIONS') and e.pic_user_id = (select auth.uid()))
      )
  ))
  with check (exists (
    select 1 from participants p, events e
    where p.id = participant_attendance.participant_id and e.id = p.event_id
      and (
        public.has_any_role('OPERATIONS_MANAGER','ADMIN')
        or (public.has_role('OPERATIONS') and e.pic_user_id = (select auth.uid()))
      )
  ));
