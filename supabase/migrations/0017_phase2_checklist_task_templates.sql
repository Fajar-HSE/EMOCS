-- Phase 2 §13.7 Event Checklist + §16.4 FR-TSK-04 Task Templates.
-- Checklist items are copied onto the event (not referenced live) when
-- generated, exactly like task creation — so a later template edit never
-- silently changes an in-flight event's checklist, and PIC customization
-- (PRD: "dapat disesuaikan per event") is just editing the event's own
-- rows without touching the template.

create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  name text not null,
  training_id uuid references trainings(id) on delete set null,
  event_type event_type,
  delivery_mode delivery_mode,
  min_participants int,
  max_participants int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_checklist_templates_updated_at before update on checklist_templates for each row execute function set_updated_at();

create table checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  category text,
  label text not null,
  is_mandatory boolean not null default false,
  sort_order int not null default 0
);

create table event_checklists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  category text,
  label text not null,
  is_mandatory boolean not null default false,
  is_done boolean not null default false,
  done_at timestamptz,
  done_by uuid references profiles(id),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_event_checklists_event on event_checklists(event_id);

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  name text not null,
  event_type event_type,
  delivery_mode delivery_mode,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  deleted_at timestamptz
);

create table task_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references task_templates(id) on delete cascade,
  title text not null,
  description text,
  days_before_event int not null default 0,
  priority task_priority not null default 'NORMAL',
  is_mandatory boolean not null default false,
  sort_order int not null default 0
);

-- Finds the best-matching active checklist template for an event (most
-- specific match wins: exact training_id beats null, exact event_type/
-- delivery_mode beats null, participant range containing the event's
-- count beats an unbounded range).
create or replace function find_checklist_template(p_event_id uuid)
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select ct.id
  from checklist_templates ct, events e
  where e.id = p_event_id
    and ct.company_id = e.company_id
    and ct.is_active
    and (ct.training_id is null or ct.training_id = e.training_id)
    and (ct.event_type is null or ct.event_type = e.event_type)
    and (ct.delivery_mode is null or ct.delivery_mode = e.delivery_mode)
    and (ct.min_participants is null or e.participant_count >= ct.min_participants)
    and (ct.max_participants is null or e.participant_count <= ct.max_participants)
  order by
    (ct.training_id is not null)::int
      + (ct.event_type is not null)::int
      + (ct.delivery_mode is not null)::int
      + (ct.min_participants is not null)::int
      + (ct.max_participants is not null)::int desc
  limit 1;
$$;

-- Generates the event's checklist from the best-matching template
-- (no-op if one already exists or no template matches). Called from
-- assign_pic() in 0018 so it fires exactly when PRD §13.7 says it should
-- ("saat status PIC_ASSIGNED").
create or replace function generate_event_checklist(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
begin
  if exists (select 1 from event_checklists where event_id = p_event_id) then
    return;
  end if;

  v_template_id := find_checklist_template(p_event_id);
  if v_template_id is null then
    return;
  end if;

  insert into event_checklists (event_id, category, label, is_mandatory, sort_order)
  select p_event_id, category, label, is_mandatory, sort_order
  from checklist_template_items
  where template_id = v_template_id
  order by sort_order;
end;
$$;

-- ---------- RLS ----------
alter table checklist_templates enable row level security;
create policy checklist_templates_select on checklist_templates for select to authenticated using (deleted_at is null);
create policy checklist_templates_write on checklist_templates for all to authenticated
  using (public.has_any_role('OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS_MANAGER','ADMIN'));

alter table checklist_template_items enable row level security;
create policy checklist_template_items_select on checklist_template_items for select to authenticated using (true);
create policy checklist_template_items_write on checklist_template_items for all to authenticated
  using (public.has_any_role('OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS_MANAGER','ADMIN'));

alter table event_checklists enable row level security;
create policy event_checklists_select on event_checklists for select to authenticated
  using (exists (select 1 from events e where e.id = event_checklists.event_id));
create policy event_checklists_write on event_checklists for all to authenticated
  using (
    public.has_any_role('OPERATIONS_MANAGER','ADMIN')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = event_checklists.event_id and e.pic_user_id = (select auth.uid())
    ))
  )
  with check (
    public.has_any_role('OPERATIONS_MANAGER','ADMIN')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = event_checklists.event_id and e.pic_user_id = (select auth.uid())
    ))
  );

alter table task_templates enable row level security;
create policy task_templates_select on task_templates for select to authenticated using (deleted_at is null);
create policy task_templates_write on task_templates for all to authenticated
  using (public.has_any_role('OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS_MANAGER','ADMIN'));

alter table task_template_items enable row level security;
create policy task_template_items_select on task_template_items for select to authenticated using (true);
create policy task_template_items_write on task_template_items for all to authenticated
  using (public.has_any_role('OPERATIONS_MANAGER','ADMIN'))
  with check (public.has_any_role('OPERATIONS_MANAGER','ADMIN'));
