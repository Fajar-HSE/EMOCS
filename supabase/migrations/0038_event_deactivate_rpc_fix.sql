-- Perbaiki deactivate_event (0037): SELECT INTO variabel komposit `events`
-- bersifat POSISIONAL, bukan by-name. 0037 memakai
--   select id, status, sales_team_id into strict v_event
-- sehingga status ('SUBMITTED' dst, enum) dicoba di-assign ke field kedua
-- tabel events (company_id uuid) -> "invalid input syntax for type uuid".
-- Solusi: SELECT * agar kolom berkorespondensi 1:1 dengan struct events.
create or replace function deactivate_event(p_event_id uuid)
returns events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
begin
  select *
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