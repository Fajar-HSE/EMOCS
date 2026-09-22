-- Master Data: soft-delete via RPC untuk 5 entitas tersisa, mengikuti pola
-- deactivate_customer (0031_customer_deactivate_rpc.sql).
--
-- LATAR BELAKANG: UPDATE ... SET deleted_at = ... lewat RLS selalu gagal 403
-- ("new row violates row-level security policy") karena PostgreSQL ikut
-- menegakkan USING dari policy SELECT (deleted_at IS NULL) ke baris BARU hasil
-- UPDATE (berlaku sebagai WITH CHECK). Gulir pola ini ke seluruh tabel
-- ber-soft-delete yang masih dipanggil dengan UPDATE langsung dari Server
-- Action (trainings, cities, trainers, venues, equipment).
--
-- Guard in-use FIX disimpan DI DALAM fungsi (visibilitas penuh), bukan lewat
-- trigger RLS yang buta bagi caller berhak parsial:
--   - trainings  -> events.training_id   (trigger trg_guard_trainings_in_use
--                     dari 0003 tetap menyala sebagai lapisan kedua)
--   - cities     -> events.city_id
--   - trainers   -> trainer_assignments.trainer_id
--   - venues     -> venue_bookings.venue_id
--   - equipment  -> equipment_assignments.equipment_id
-- Tidak ada trigger guard di DB untuk cities/trainers/venues/equipment (hanya
-- 0003 untuk customers & trainings), jadi pengecekan di dalam fungsi ini
-- adalah satu-satunya lapisan untuk entitas Phase 2.

create or replace function deactivate_training(p_training_id uuid)
returns trainings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_training trainings;
begin
  if not public.has_any_role('OPERATIONS_MANAGER', 'ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if exists (select 1 from events where training_id = p_training_id and deleted_at is null) then
    raise exception 'TRAINING_IN_USE: cannot deactivate a training with existing events';
  end if;

  update trainings
  set deleted_at = now(), is_active = false, updated_by = auth.uid(), updated_at = now()
  where id = p_training_id and deleted_at is null
  returning * into v_training;

  if not found then
    raise exception 'TRAINING_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_training;
end;
$$;

grant execute on function deactivate_training(uuid) to authenticated;
revoke execute on function deactivate_training(uuid) from public, anon;

create or replace function deactivate_city(p_city_id uuid)
returns cities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city cities;
begin
  if not public.has_any_role('OPERATIONS_MANAGER', 'ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if exists (select 1 from events where city_id = p_city_id and deleted_at is null) then
    raise exception 'CITY_IN_USE: cannot deactivate a city used by existing events';
  end if;

  -- cities tidak punya kolom updated_at/updated_by — hanya soft delete.
  update cities
  set deleted_at = now()
  where id = p_city_id and deleted_at is null
  returning * into v_city;

  if not found then
    raise exception 'CITY_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_city;
end;
$$;

grant execute on function deactivate_city(uuid) to authenticated;
revoke execute on function deactivate_city(uuid) from public, anon;

create or replace function deactivate_trainer(p_trainer_id uuid)
returns trainers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer trainers;
begin
  if not public.has_any_role('OPERATIONS', 'OPERATIONS_MANAGER', 'ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if exists (select 1 from trainer_assignments where trainer_id = p_trainer_id and deleted_at is null) then
    raise exception 'TRAINER_IN_USE: cannot deactivate a trainer with existing assignments';
  end if;

  update trainers
  set deleted_at = now(), is_active = false, updated_by = auth.uid(), updated_at = now()
  where id = p_trainer_id and deleted_at is null
  returning * into v_trainer;

  if not found then
    raise exception 'TRAINER_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_trainer;
end;
$$;

grant execute on function deactivate_trainer(uuid) to authenticated;
revoke execute on function deactivate_trainer(uuid) from public, anon;

create or replace function deactivate_venue(p_venue_id uuid)
returns venues
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venue venues;
begin
  if not public.has_any_role('OPERATIONS', 'OPERATIONS_MANAGER', 'ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if exists (select 1 from venue_bookings where venue_id = p_venue_id and deleted_at is null) then
    raise exception 'VENUE_IN_USE: cannot deactivate a venue with existing bookings';
  end if;

  update venues
  set deleted_at = now(), is_active = false, updated_by = auth.uid(), updated_at = now()
  where id = p_venue_id and deleted_at is null
  returning * into v_venue;

  if not found then
    raise exception 'VENUE_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_venue;
end;
$$;

grant execute on function deactivate_venue(uuid) to authenticated;
revoke execute on function deactivate_venue(uuid) from public, anon;

create or replace function deactivate_equipment(p_equipment_id uuid)
returns equipment
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipment equipment;
begin
  if not public.has_any_role('OPERATIONS', 'OPERATIONS_MANAGER', 'ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if exists (select 1 from equipment_assignments where equipment_id = p_equipment_id and deleted_at is null) then
    raise exception 'EQUIPMENT_IN_USE: cannot deactivate equipment with existing assignments';
  end if;

  update equipment
  set deleted_at = now(), is_active = false, updated_by = auth.uid(), updated_at = now()
  where id = p_equipment_id and deleted_at is null
  returning * into v_equipment;

  if not found then
    raise exception 'EQUIPMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_equipment;
end;
$$;

grant execute on function deactivate_equipment(uuid) to authenticated;
revoke execute on function deactivate_equipment(uuid) from public, anon;