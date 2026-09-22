-- ============================================================
-- 0032: Tipe event disederhanakan ke 4 pilihan + seed Program Pelatihan
-- ============================================================
-- 1) event_type enum: (INHOUSE,PUBLIC,ONLINE,HYBRID,ASSESSMENT)
--    -> (INHOUSE, PUBLIC, PRIVATE, CUSTOM). Keputusan user 2026-09-15.
--    Nilai lama ONLINE/HYBRID/ASSESSMENT dimigrasikan ke INHOUSE (billing
--    kontrak, bukan per-peserta)——semua kolom yang memakai tipe ini di-swap.
--    Postgres tidak bisa menghapus anggota enum, jadi pola create-new + swap.
-- 2) Seed master `trainings` dengan 3 program default per perusahaan
--    (Training / Training + Certification / Certification Only), agar
--    dropdown Program Pelatihan di Event Request langsung berisi opsi sesuai
--    permintaan user. Master tetap bisa ditambah lewat UI Master Data.

-- ---------- 1. event_type: buat enum baru ----------
create type event_type_v2 as enum ('INHOUSE', 'PUBLIC', 'PRIVATE', 'CUSTOM');

alter table events alter column event_type type event_type_v2
  using (case when event_type is null then null::event_type_v2
              when event_type = 'PUBLIC' then 'PUBLIC'::event_type_v2
              else 'INHOUSE'::event_type_v2 end);

alter table checklist_templates alter column event_type type event_type_v2
  using (case when event_type is null then null::event_type_v2
              when event_type = 'PUBLIC' then 'PUBLIC'::event_type_v2
              else 'INHOUSE'::event_type_v2 end);

alter table task_templates alter column event_type type event_type_v2
  using (case when event_type is null then null::event_type_v2
              when event_type = 'PUBLIC' then 'PUBLIC'::event_type_v2
              else 'INHOUSE'::event_type_v2 end);

drop type event_type;
alter type event_type_v2 rename to event_type;

-- ---------- 2. Seed Program Pelatihan ----------
insert into trainings (company_id, code, name, has_certification)
select c.id, v.code, v.name, v.cert
from companies c
cross join (values
  ('TRAINING', 'Training', false),
  ('TRAINING_CERT', 'Training + Certification', true),
  ('CERT_ONLY', 'Certification Only', true)
) as v(code, name, cert)
on conflict (company_id, code) do nothing;