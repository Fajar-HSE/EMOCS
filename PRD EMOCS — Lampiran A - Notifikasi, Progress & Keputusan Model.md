# PRD EMOCS — Lampiran A: Notifikasi, Progress & Keputusan Model

**Versi:** 1.0
**Status:** Draft for Management Review
**Induk:** `PRD EMOCS — Product Requirements Document.md` v1.1
**Batasan:** Dokumen ini berisi **keputusan produk/bisnis**. Mekanisme teknis penegakkannya tetap di `System_Design.md`.

> **Mengapa lampiran ini ada.** PRD §34 menetapkan bahwa keputusan produk bersumber di PRD dan implementasi teknis di `System_Design.md`. Saat menyusun lampiran, ditemukan tiga keputusan produk yang belum diambil meskipun sistemnya sudah dikembangkan: routing notifikasi, definisi progress saat checklist Phase 2 aktif, dan model multi-customer untuk public class. Ketiganya tidak boleh ditentukan implisit oleh implementasi — sesuai prinsip *"jangan hardcode asumsi sebagai keputusan final"* (`System_Design.md` §18.4).

---

## A.1 Notification Routing Matrix

### A.1.1 Tujuan

PRD §15 menetapkan prinsip *"notifikasi harus membantu user mengambil tindakan, bukan membanjiri user dengan pesan"*. `System_Design.md` §5.3 sudah menyediakan mekanisme pengiriman (`create_notification`, Supabase Realtime, antrean `notification_deliveries`). Yang belum ada adalah **keputusan produknya**: setiap trigger dijembatani ke siapa, lewat kanal apa, dan kapan boleh dibungkus (digest).

### A.1.2 Kanal & Ketersediaan

| Kanal | Phase | Catatan |
|---|---|---|
| In-app (Realtime) | Phase 1 | Default semua notifikasi; selalu dibawa konteks + link ke event |
| Email | Phase 2 | Untuk trigger yang tidak time-sensitive atau saat user sedang offline |
| WhatsApp | Phase 2 `[OQ-19]` | Hanya trigger **action-critical**. Berbiaya per pesan — jangan dipakai untuk info biasa |

### A.1.3 Matriks Routing

Legenda: **●** = kirim kanal ini · **○** = kirim hanya jika user tidak aktif (default: >4 jam) · **—** = tidak kirim.

| # | Trigger (PRD §15) | Sales | Sales Mgr | PIC | Ops Mgr | Finance | In-app | Email | WA |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| N01 | Event submitted | ● | ○ | — | ● | — | ● | ○ | — |
| N02 | Event approved | ● | ○ | — | ● | — | ● | ○ | — |
| N03 | Event rejected | ● | ○ | — | ● | — | ● | ● | — |
| N04 | Revision requested | ● | ○ | — | ● | — | ● | ● | — |
| N05 | PIC assigned | ● | — | ● | ● | — | ● | ○ | — |
| N06 | PIC changed | ● | — | ● | ● | — | ● | ● | — |
| N07 | Task assigned | — | — | ● | ○ | — | ● | ○ | — |
| N08 | Task overdue | — | — | ● | ● | — | ● | ○ | ● |
| N09 | Event status changed | ● | ○ | ● | ● | ○ | ● | ○ | — |
| N10 | Event completed | ● | ○ | ● | ● | ● | ● | ○ | — |
| N11 | Event cancelled | ● | ● | ● | ● | ● | ● | ● | — |
| N12 | Event postponed | ● | ● | ● | ● | ● | ● | ● | — |
| N13 | Masalah kritis (CRITICAL issue) | ○ | ● | ● | ● | — | ● | ● | ● |
| N14 | Financial approval (Phase 3) | — | — | — | — | ● | ● | ● | — |
| N15 | Financial closing (Phase 3) | ● | — | — | ● | ● | ● | ● | — |

### A.1.4 Aturan Tambahan

1. **Satu notifikasi = satu tindakan yang jelas.** Setiap notifikasi wajib membawa: nama event, Event ID, status saat ini, dan tombol/link langsung ke layar yang relevan (PRD §15).
2. **Bundling (digest).** Notifikasi non-kritis (○) dari event yang sama dalam jendela 30 menit dibundus menjadi satu pesan. Implementasi via `notification_deliveries` (`System_Design.md` §5.3).
3. **Quiet hours.** Tidak ada email/WA pada 21:00–07:00 WIB; ditunda ke jam kerja berikutnya. In-app tetap.
4. **Preferensi user.** Setiap user dapat mematikan kanal email/WA per-kategori, **kecuali** trigger yang ditandai ● di kanal tersebut (unsubscribable) — yaitu WA untuk N08 (task overdue) dan N13 (masalah kritis). Lihat `updateNotificationPrefs` (`System_Design.md` §9.2).
5. **Tidak ada notifikasi untuk read-only role.** Management menerima dashboard + digest harian (SHOULD HAVE PRD §22), bukan per-event alert.
6. **Status tidak boleh hanya diketahui dari notifikasi.** Notifikasi adalah pendorong; status tetap bisa dilihat di Event Detail tanpa membuka pesan (PRD §13).

### A.1.5 Implikasi Teknis (untuk `System_Design.md`)

- Tabel konfigurasi routing sebaiknya **data-driven** (bukan hardcode di kode), mengikuti pola `event_status_transitions` — memungkinkan routing diubah tanpa deploy.
- Notifikasi WA (N08, N13) wajib idempoten: pengiriman ulang tidak boleh membanjiri user.
- `notification_deliveries` perlu kolom `digest_group_key` untuk mendukung aturan 2.

---

## A.2 Progress & Checklist — Definisi Satu Angka

### A.2.1 Masalah

`System_Design.md` §8.4.6: `progress_percentage = (task DONE ÷ total task aktif) × 100`. PRD §14: *"Progress event dihitung dari penyelesaian task."* Tapi Phase 2 memperkenalkan **checklist wajib** (`event_checklists`) yang terpisah dari task (PRD §17.1). Tanpa aturan, akan muncul dua angka yang saling bertentangan: progress task 100% tapi checklist belum selesai.

### A.2.2 Keputusan

> **Checklist TIDAK mengubah progress event.** Checklist adalah **gate** (syarat masuk status), bukan komponen progress.

| Konsep | Definisi | Ditampilkan sebagai |
|---|---|---|
| **Progress event** | Tetap dari task: `DONE ÷ task aktif` (task CANCELLED dikeluarkan, BR-TSK-05) | Persen tunggal di Event Detail |
| **Kesiapan (readiness)** | Status checklist wajib + issue CRITICAL terbuka | Badge/indikator terpisah, bukan persen |

**Alasan:** PRD §14 secara eksplisit mendefinisikan progress dari task. Mencampur checklist ke dalamnya akan membuat angka tidak dapat diprediksi dan melanggar prinsip *Data Quality* (sedikit data benar > banyak data tidak lengkap). Pemisahan juga konsisten dengan arsitektur "overlay, bukan status" (`System_Design.md` §8.2): checklist adalah syarat, bukan kemajuan.

### A.2.3 Edge Cases

| Kasus | Hasil |
|---|---|
| Event tanpa task | Progress ditampilkan `0%` **dengan label** "Belum ada task" — bukan dikosongkan, bukan `100%` |
| Semua task selesai tapi checklist mandatory belum DONE | Progress `100%`, **tapi** event **tidak bisa** masuk `READY` (BR-TSK-07) — badge kesiapan merah |
| Task overdue | Tetap dihitung sebagai aktif (belum selesai); overdue adalah atribut, bukan pengurang progress |
| Task diblokir | Tetap aktif; blocking wajib beralasan (BR-TSK-02) dan memengaruhi kesiapan |
| Event CANCELLED | Progress dibekukan pada nilai terakhir; tidak dihitung ulang |

### A.2.4 Implikasi Teknis

- `progress_percentage` tetap dihitung trigger pada perubahan task; **tidak** ada trigger dari `event_checklists`.
- Event Detail Phase 2 menambahkan indikator kesiapan: `siap = (mandatory checklist DONE) AND (no CRITICAL issue)` — komponen yang sudah ada di syarat `READY` (`System_Design.md` §8.3), cukup diekspos ke UI, bukan dihitung ulang.

---

## A.3 Model Data untuk Public Class (OQ-15)

> **Status: BUTUH KEPUTUSAN MANAGEMENT sebelum coding area public class.** Diberikan opsi + rekomendasi; keputusan final tetap di tangan business owner.

### A.3.1 Konteks

Asumsi PRD §32: *"event memiliki satu customer"*. ERD logis saat ini (`System_Design.md` §6.4): `EVENTS.customer_id` — **satu customer per event**. Realitas bisnis training: **public class** sering diisi peserta dari beberapa perusahaan. `System_Design.md` §18.4 menandai ini *"putuskan sebelum Phase 1 bila ya"* — peringatan yang sampai saat ini masih terbuka.

### A.3.2 Opsi

**Opsi A — Satu event, satu customer (status quo)**

Public class direpresentasikan sebagai **satu event per batch customer**. Satu class dengan 3 perusahaan = 3 event terpisah.

- Pro: skema tidak berubah; `sales_value`, revenue recognition, dan profitabilitas per-customer tetap bersih.
- Kontra: duplicative — nama training, tanggal, trainer, venue diulang; benchmark training jadi terfragmentasi (BI Phase 4 susun menyatukan); kompleksitas input di lapangan.
- Cocok bila: public class adalah minoritas (<20%) dan setiap batch pada dasarnya didominasi satu customer.

**Opsi B — Junction table `event_customers` (M-N)**

Tambah `event_customers(event_id, customer_id, sales_value, po_number, ...)`. Satu event bisa banyak customer.

- Pro: merepresentasikan public class secara alami; BI Phase 4 akurat; input lapangan sekali.
- Kontra: sales_value & revenue recognition pindah ke per-baris junction (bukan lagi kolom `events`); `event_financials` harus agregasi per customer; **migrasi skema data** + perubahan RLS `event_select` (policy saat ini membandingkan `sales_user_id`; perlu join junction untuk visibility).
- Cocok bila: public class adalah lini bisnis utama, atau direncanakan jadi prioritas.

**Opsi C — Flag `is_public_class` tanpa junction**

Event tetap satu customer "utama"; peserta lain hanya data peserta (`participants`), tanpa relasi komersial.

- Pro: perubahan minimal; data peserta tetap lengkap untuk sertifikasi.
- Kontra: profitabilitas per customer kedua+ tidak bisa dihitung — melanggar BO-5 bila customer tersebut signifikan.

### A.3.3 Rekomendasi

> **Opsi A sekarang, siap migrasi terkontrol ke Opsi B kemudian.**

Alasan: sebagian besar event training B2B adalah in-house (1:1); skema saat ini sudah benar untuk mayoritas. Opsi B diterapkan **hanya ketika** (a) public class >20% pipeline, atau (b) fitur public class resmi masuk roadmap Phase 2 — dengan migrasi yang merubah `events.sales_value` → default pada junction baris pertama. Skema junction (`event_customers`) dapat disiapkan sebagai tabel kosong + RLS sejak Phase 1 tanpa mengaktifkan alurnya — mengikuti pola "skema Phase 2–3 sudah disiapkan via migrasi" (`System_Design.md` §5.1).

**Yang TIDAK boleh terjadi:** membiarkan Opsi C secara default (input peserta tanpa relasi komersial) hanya karena "sementara" — itu menghasilkan data profitabilitas yang tidak bisa diaudit.

### A.3.4 Pertanyaan untuk Management

1. Berapa persentase pipeline saat ini berupa public class vs in-house?
2. Apakah profitabilitas **per customer** pada public class penting untuk keputusan bisnis? (Jika tidak, Opsi C dapat diterima.)
3. Kapan fitur public class masuk roadmap resmi?

---

## A.4 Mobile-Critical Paths

`System_Design.md` §2 prinsip 12: *"Mobile-first untuk alur Operations — pekerjaan utama harus selesai dari viewport 360px."* Berikut definisi "pekerjaan utama" — **maksimal 5 flow** yang wajib lulus uji mobile sebelum yang lain:

| # | Flow | Pengguna utama | Mengapa kritis |
|---|---|---|---|
| M1 | **Lihat Event Detail** (status, PIC, progress, next action) | Sales, PIC | Ini adalah inti MVP (PRD §1.3) — flow yang menggantikan bertanya via WhatsApp |
| M2 | **Lihat & selesaikan task** | PIC | Aksi operasional paling sering di lapangan |
| M3 | **Buka notifikasi → langsung ke event** | Semua | Notifikasi tanpa navigasi yang baik = kembali ke WhatsApp |
| M4 | **Ubah status operasional** (READY→RUNNING→COMPLETED) | PIC | Eksekusi di hari-H dilakukan dari ponsel |
| M5 | **Buat issue** (Phase 2) | PIC | Masalah lapangan muncul saat berlangsung, harus bisa dicatat dalam <30 detik |

**Bukan mobile-critical (desktop-first acceptable):** Dashboard Management, Review request (Ops Manager), User management, Konfigurasi financial. Ini tetap harus *responsive* (tidak pecah), tapi tidak menjadi prioritas QA mobile.

**Catatan QA:** setiap flow di atas harus bisa diselesaikan dalam **≤3 interaksi** dari notifikasi/pintasan (PRD §24: "User selalu mengetahui langkah berikutnya").

---

## A.5 Hubungan dengan Dokumen Lain

```text
Lampiran A (dokumen ini)
│
├── Routing notifikasi  → implementasi: System_Design.md §5.3, §9.2
├── Progress & checklist → implementasi: System_Design.md §8.4.6, §7.2
├── OQ-15 model         → implementasi: System_Design.md §6.4, §18.4
└── Mobile paths        → implementasi: System_Design.md §2 (prinsip 12), §14
```

Jika terjadi konflik: **keputusan produk → lampiran ini + PRD induknya**; **implementasi teknis → `System_Design.md`**; **visual → `DESIGN.md`**.

---

## A.6 Decision Log

| Tanggal | Keputusan | Status | Diputuskan oleh |
|---|---|---|---|
| 2026-09-18 | Checklist TIDAK ikut progress event; dipisah sebagai gate kesiapan | **Diajukan** — menunggu konfirmasi process owner |
| 2026-09-18 | Routing notifikasi: WA hanya untuk task overdue & masalah kritis | **Diajukan** — menunggu keputusan `[OQ-19]` |
| 2026-09-18 | OQ-15: Opsi A (satu event satu customer) untuk sekarang | **Menunggu jawaban 3 pertanyaan A.3.4** |
| 2026-09-18 | Mobile-critical paths M1–M5 ditetapkan | **Diajukan** |
