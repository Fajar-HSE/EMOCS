-- Master Data Customer: soft-delete via RPC, bukan UPDATE langsung.
--
-- TEMUAN ( investigasi 2026-09-15 ): UPDATE ... SET deleted_at = ... lewat RLS
-- SELALU gagal 403 ("new row violates row-level security policy"), bahkan untuk
-- ADMIN. Penyebab: PostgreSQL ikut menegakkan USING dari policy SELECT
-- (deleted_at IS NULL) terhadap baris BARU hasil UPDATE — baris yang baru
-- di-soft-delete otomatis gagal WITH CHECK. Terbukti lewat 3 reproduksi
-- independen + EXPLAIN yang menampilkan filter ekstra tersebut di plan UPDATE.
-- Kemungkinan besar pola yang sama memengaruhi SEMUA tabel ber-soft-delete
-- (lihat PROJECT_STATUS — rollout bertahap, jangan sekaligus).
--
-- Solusi mengikuti idiom kode yang ada (transition_event_status, decide_*):
-- fungsi SECURITY DEFINER dengan pengecekan role di dalam. Trigger BEFORE
-- UPDATE (guard_master_data_in_use, audit) tetap menyala — dan guard kini
-- justru membaca events dengan visibilitas PENUH (bukan buta-RLS seperti
-- sebelumnya untuk caller berhak parsial).
create or replace function deactivate_customer(p_customer_id uuid)
returns customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer customers;
begin
  if not public.has_any_role('OPERATIONS_MANAGER', 'ADMIN') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update customers
  set deleted_at = now(), updated_by = auth.uid(), updated_at = now()
  where id = p_customer_id and deleted_at is null
  returning * into v_customer;

  if not found then
    raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_customer;
end;
$$;

grant execute on function deactivate_customer(uuid) to authenticated;
revoke execute on function deactivate_customer(uuid) from public, anon;
