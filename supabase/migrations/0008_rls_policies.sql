-- Stage 1: Row Level Security for every table (PRD §23.3, §28 mandatory
-- mitigation "tabel baru tanpa RLS"). Pattern: enable RLS everywhere, then
-- either grant a real policy or leave it default-deny for system-only
-- tables (event_number_counters, event_status_transitions,
-- notification_deliveries — touched only by SECURITY DEFINER functions,
-- which run as the table owner and bypass RLS).
--
-- Note on sales_value visibility (PRD D04 "Sales boleh lihat event lain,
-- read-only tanpa data komersial"): unlike Phase 3 actual_cost/margin
-- (§24.4, split into event_financials specifically because "RLS bekerja
-- per baris, bukan per kolom"), sales_value stays a plain column on
-- events for Phase 1 — RLS here only gates row visibility; masking the
-- sales_value column for non-owners is done in the TypeScript query layer
-- (Stage 4/6), matching how the PRD scopes column-level masking to the
-- genuinely sensitive Phase 3 financial fields only.

-- ---------- companies / teams ----------
alter table companies enable row level security;
create policy companies_select on companies for select to authenticated
  using (deleted_at is null);
create policy companies_update on companies for update to authenticated
  using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

alter table teams enable row level security;
create policy teams_select on teams for select to authenticated
  using (deleted_at is null);
create policy teams_write on teams for all to authenticated
  using (public.has_any_role('ADMIN','OPERATIONS_MANAGER'))
  with check (public.has_any_role('ADMIN','OPERATIONS_MANAGER'));

-- ---------- roles / permissions ----------
alter table roles enable row level security;
create policy roles_select on roles for select to authenticated using (true);

alter table permissions enable row level security;
create policy permissions_select on permissions for select to authenticated using (true);

alter table role_permissions enable row level security;
create policy role_permissions_select on role_permissions for select to authenticated using (true);
create policy role_permissions_write on role_permissions for all to authenticated
  using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

-- ---------- profiles / user_roles / invited_emails ----------
alter table profiles enable row level security;
create policy profiles_select on profiles for select to authenticated
  using (is_active or id = (select auth.uid()) or public.has_role('ADMIN'));
create policy profiles_update_self on profiles for update to authenticated
  using (id = (select auth.uid()) or public.has_role('ADMIN'))
  with check (id = (select auth.uid()) or public.has_role('ADMIN'));

alter table user_roles enable row level security;
create policy user_roles_select on user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.has_any_role('ADMIN','OPERATIONS_MANAGER','MANAGEMENT'));
create policy user_roles_write on user_roles for all to authenticated
  using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

alter table invited_emails enable row level security;
create policy invited_emails_all on invited_emails for all to authenticated
  using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

-- ---------- master data ----------
alter table cities enable row level security;
create policy cities_select on cities for select to authenticated using (deleted_at is null);
create policy cities_write on cities for all to authenticated
  using (public.has_any_role('ADMIN','OPERATIONS_MANAGER'))
  with check (public.has_any_role('ADMIN','OPERATIONS_MANAGER'));

alter table trainings enable row level security;
create policy trainings_select on trainings for select to authenticated using (deleted_at is null);
create policy trainings_write on trainings for all to authenticated
  using (public.has_any_role('ADMIN','OPERATIONS_MANAGER'))
  with check (public.has_any_role('ADMIN','OPERATIONS_MANAGER'));

alter table customers enable row level security;
create policy customers_select on customers for select to authenticated using (deleted_at is null);
create policy customers_insert on customers for insert to authenticated
  with check (public.has_any_role('SALES','SALES_MANAGER','OPERATIONS_MANAGER','ADMIN'));
create policy customers_update on customers for update to authenticated
  using (public.has_any_role('OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS_MANAGER','ADMIN'));

alter table customer_contacts enable row level security;
create policy customer_contacts_select on customer_contacts for select to authenticated using (deleted_at is null);
create policy customer_contacts_insert on customer_contacts for insert to authenticated
  with check (public.has_any_role('SALES','SALES_MANAGER','OPERATIONS_MANAGER','ADMIN'));
create policy customer_contacts_update on customer_contacts for update to authenticated
  using (public.has_any_role('SALES','SALES_MANAGER','OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('SALES','SALES_MANAGER','OPERATIONS_MANAGER','ADMIN'));

-- ---------- events (PRD §23.3 pattern, extended) ----------
alter table events enable row level security;

create policy events_select on events for select to authenticated
  using (
    deleted_at is null
    and (
      public.has_any_role('ADMIN','MANAGEMENT','OPERATIONS_MANAGER')
      or (public.has_role('OPERATIONS') and (pic_user_id = (select auth.uid()) or backup_pic_user_id = (select auth.uid())))
      or public.has_role('SALES') -- D04: Sales may read ALL events, commercial fields masked in the app layer
      or (public.has_role('SALES_MANAGER') and sales_team_id = (select team_id from profiles where id = (select auth.uid())))
    )
  );

create policy events_insert on events for insert to authenticated
  with check (
    public.has_any_role('SALES','SALES_MANAGER','OPERATIONS','OPERATIONS_MANAGER','ADMIN')
    and (
      sales_user_id = (select auth.uid())
      or public.has_any_role('SALES_MANAGER','OPERATIONS_MANAGER','ADMIN')
    )
  );

create policy events_update on events for update to authenticated
  using (
    deleted_at is null
    and status <> 'CLOSED'
    and (
      public.has_any_role('ADMIN','OPERATIONS_MANAGER')
      or (status in ('DRAFT','SUBMITTED','REVISION_REQUESTED') and (
            (public.has_role('SALES') and sales_user_id = (select auth.uid()))
            or (public.has_role('SALES_MANAGER') and sales_team_id = (select team_id from profiles where id = (select auth.uid())))
         ))
      or (public.has_role('OPERATIONS') and pic_user_id = (select auth.uid()))
    )
  )
  with check (
    deleted_at is null
    and (
      public.has_any_role('ADMIN','OPERATIONS_MANAGER')
      or (status in ('DRAFT','SUBMITTED','REVISION_REQUESTED') and (
            (public.has_role('SALES') and sales_user_id = (select auth.uid()))
            or (public.has_role('SALES_MANAGER') and sales_team_id = (select team_id from profiles where id = (select auth.uid())))
         ))
      or (public.has_role('OPERATIONS') and pic_user_id = (select auth.uid()))
    )
  );
-- No DELETE policy anywhere on events => hard delete is always denied (BR-EVT-17).

-- ---------- event_status_history (read-only mirror of events visibility) ----------
alter table event_status_history enable row level security;
create policy event_status_history_select on event_status_history for select to authenticated
  using (exists (
    select 1 from events e where e.id = event_status_history.event_id
  ));
-- No insert/update/delete policy: only transition_event_status() (SECURITY
-- DEFINER, owned by the migration role) may write here.

-- ---------- event_tasks ----------
alter table event_tasks enable row level security;
create policy event_tasks_select on event_tasks for select to authenticated
  using (exists (
    select 1 from events e where e.id = event_tasks.event_id
  ));
create policy event_tasks_write on event_tasks for all to authenticated
  using (
    public.has_any_role('ADMIN','OPERATIONS_MANAGER')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = event_tasks.event_id and e.pic_user_id = (select auth.uid())
    ))
  )
  with check (
    public.has_any_role('ADMIN','OPERATIONS_MANAGER')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = event_tasks.event_id and e.pic_user_id = (select auth.uid())
    ))
  );

-- ---------- event_comments / attachments (Should Have, schema ready) ----------
alter table event_comments enable row level security;
create policy event_comments_select on event_comments for select to authenticated
  using (deleted_at is null and exists (select 1 from events e where e.id = event_comments.event_id));
create policy event_comments_insert on event_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from events e where e.id = event_comments.event_id)
  );

alter table attachments enable row level security;
create policy attachments_select on attachments for select to authenticated
  using (deleted_at is null and exists (select 1 from events e where e.id = attachments.event_id));
create policy attachments_insert on attachments for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (select 1 from events e where e.id = attachments.event_id)
  );

-- ---------- notifications ----------
alter table notifications enable row level security;
create policy notifications_select_own on notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));
create policy notifications_update_own on notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));

alter table notification_deliveries enable row level security;
-- No policies: only Edge Functions using the service role write/read here.

-- ---------- audit_logs (append-only, PRD §29.2) ----------
alter table audit_logs enable row level security;
create policy audit_logs_select on audit_logs for select to authenticated
  using (
    public.has_any_role('ADMIN','MANAGEMENT')
    or (public.has_role('OPERATIONS_MANAGER') and table_name in ('events','event_tasks'))
  );
-- No insert/update/delete policy for authenticated: fn_audit() is
-- SECURITY DEFINER and append-only is enforced by omission of any
-- write policy whatsoever.

-- ---------- system-only tables: RLS on, no policies (deny-all) ----------
alter table event_number_counters enable row level security;
alter table event_status_transitions enable row level security;
create policy event_status_transitions_select on event_status_transitions for select to authenticated using (true);
