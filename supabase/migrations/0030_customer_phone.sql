-- Master Data Customer: nomor telepon perusahaan.
-- Diminta oleh form "Tambah Customer Baru" (Nama/Alamat/Telepon perusahaan +
-- data PIC yang disimpan di customer_contacts). Kolom nullable agar baris
-- lama tetap valid; tidak ada perubahan RLS/policy.
alter table customers add column if not exists phone text;
