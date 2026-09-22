-- Phase 2 §13.5 Document Management. Private Storage bucket + signed URLs
-- only (PRD: "jangan pernah memakai bucket publik untuk dokumen berisi
-- data customer atau peserta"). Objects are stored at
-- `{event_id}/{uuid}-{filename}` so the storage RLS policy can check
-- access to that event via the path's first segment.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create type document_type as enum (
  'PROPOSAL','PO','INVOICE','ATTENDANCE','MATERIAL','CERTIFICATE',
  'PHOTO','EVENT_REPORT','EXPENSE_RECEIPT','CONTRACT','OTHER'
);
create type document_verification_status as enum ('PENDING','VERIFIED','REJECTED');

create table documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  document_type document_type not null,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  version int not null default 1,
  is_mandatory boolean not null default false,
  verification_status document_verification_status not null default 'PENDING',
  verification_note text,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_documents_event on documents(event_id);
create trigger trg_audit_documents after insert or update or delete on documents for each row execute function fn_audit();

alter table documents enable row level security;
create policy documents_select on documents for select to authenticated
  using (deleted_at is null and exists (select 1 from events e where e.id = documents.event_id));
create policy documents_insert on documents for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (select 1 from events e where e.id = documents.event_id)
  );
create policy documents_update on documents for update to authenticated
  using (
    public.has_any_role('OPERATIONS_MANAGER','ADMIN')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = documents.event_id and e.pic_user_id = (select auth.uid())
    ))
  )
  with check (
    public.has_any_role('OPERATIONS_MANAGER','ADMIN')
    or (public.has_role('OPERATIONS') and exists (
      select 1 from events e where e.id = documents.event_id and e.pic_user_id = (select auth.uid())
    ))
  );

-- Storage RLS: the object's path is `{event_id}/{filename}` — reuse the
-- exact same visibility rule as the `events` row itself (storage.foldername
-- splits the path into an array of segments; [1] is the first one).
create policy documents_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from events e
      where e.id::text = (storage.foldername(name))[1]
    )
  );
create policy documents_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from events e
      where e.id::text = (storage.foldername(name))[1]
    )
  );
