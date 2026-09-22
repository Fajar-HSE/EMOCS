-- Event: soft-delete ("Hapus" di Daftar Event) via RPC SECURITY DEFINER.
--
-- LATAR BELAKANG: UPDATE ... SET deleted_at = ... lewat RLS selalu gagal 403
-- ("new row violates row-level security policy") karena kolom deleted_at ikut
-- ditegakkan sebagai WITH CHECK oleh policy events_update (deleted_at IS NULL),
-- sehingga baris BARU hasil soft delete dianggap melanggar. Karena itulah soft
-- delete master data memakai RPC (0031/0036) — pola yang sama diterapkan di sini.
--
-- SCOPE role (menyamai policy events_update, BR-EVT / PRD):
--   - ADMIN, OPERATIONS_MANAGER : semua status kecuali CLOSED.
--   - SALES_MANAGER             : hanya event tim sendiri (sales_team_id) yang
--                                   berstatus SUBMITTED / REVISION_REQUESTED.
-- Hard delete events tetap dilarang (tidak ada policy DELETE — BR-EVT-17).
-- Event yang di-soft-delete: deleted_at terisi, hilang dari daftar & pencarian
-- (semua query memfilter deleted_at IS NULL) namun data utuh untuk audit.

create or replace function deactivate_event(p_event_id uuid)
returns events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
begin
  select id, status, sales_team_id
    into strict v_event
    from events
   where id = p_event_id and deleted_at is null;

  if v_event.status = 'CLOSED' then
    raise exception 'EVENT_CLOSED: cannot delete a closed event' using errcode = '42501';
  end if;

  if public.has_any_role('ADMIN', 'OPERATIONS_MANAGER') then
    -- berhak atas semua status non-CLOSED
    null;
  elsif public.has_role('SALES_MANAGER')
    and v_event.status in ('SUBMITTED', 'REVISION_REQUESTED')
    and v_event.sales_team_id = (select team_id from profiles where id = (select auth.uid())) then
    null;
  else
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update events
  set deleted_at = now(), updated_at = now(), updated_by = auth.uid()
  where id = p_event_id and deleted_at is null
  returning * into v_event;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_event;
end;
$$;

grant execute on function deactivate_event(uuid) to authenticated;
revoke execute on function deactivate_event(uuid) from public, anon;