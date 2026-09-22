# EMOCS — Project Status Checkpoint

> Checkpoint pekerjaan, dibuat 2026-09-10, diperbarui 2026-09-11. Referensi utama: PRD di
> `../Event-Management-Operational-Control-System.md/PRD-Event-Management-Operational-Control-System.md`.
> Plan Phase 1 lengkap ada di `C:\Users\DELL\.claude\plans\hazy-hugging-cupcake.md`.
> **Plan Phase 3 (Financial) lengkap ada di `C:\Users\DELL\.claude\plans\hazy-hugging-cupcake.md`
> juga** (plan file yang sama di-overwrite dengan rencana Phase 3 setelah Phase 2 selesai) —
> berisi keputusan arsitektur detail, skema tiap stage, dan tabel tahapan A–H. Baca file itu
> untuk detail Phase 3 yang tidak diulang di sini.

## 1. Apa yang Sudah Selesai

### Phase 1 (MVP) — SELESAI, terverifikasi end-to-end di browser
Semua 9 stage (Stage 0–9) selesai dan sudah dijalankan langsung di Supabase Cloud project
milik user (bukan cuma ditulis, sudah di-push & diuji lewat browser sungguhan):

- **Stage 0** — Scaffold Next.js 16 (App Router, Turbopack, TS strict) + shadcn/ui (Base UI) + Supabase link.
- **Stage 1** — Skema DB lengkap (companies, profiles, roles, RBAC, customers, trainings, cities,
  events, event_status_history, event_tasks, notifications, audit_logs, event_number_counters, dst),
  RLS di semua tabel, `fn_audit()`, `generate_event_code()`, custom access token hook.
- **Stage 2** — Auth: Google OAuth + email/password sekaligus, invite-only, domain restriction, proxy.ts (middleware Next 16).
- **Stage 3** — Master data (Customer, Training, City) + Admin user management.
- **Stage 4** — Event Request wizard 4 langkah, Event ID generator, deteksi duplikat, flag RUSH, Event List.
- **Stage 5** — Workflow engine (state machine via `transition_event_status()`), review, assign/change PIC, cancel/postpone.
- **Stage 6** — Event Detail (Overview/Tasks/Timeline), Task CRUD, progress trigger otomatis.
- **Stage 7** — Notifikasi in-app + Supabase Realtime (lonceng notifikasi live).
- **Stage 8** — Dashboard 3 role (Sales/Ops/Management), mobile responsive, cron task overdue.
- **Stage 9** — Hardening & acceptance pass (AC-01 s/d AC-17 diverifikasi manual di browser).

Commit terakhir Phase 1: `b6f290e Stage 9: Hardening & acceptance pass — Phase 1 MVP complete`.

### Phase 2 — SELESAI, terverifikasi end-to-end di browser (semua 8 fitur)

**Skema DB Phase 2 (selesai, sudah di-push, RLS 100% terverifikasi 39/39 tabel):**

| Migration | Isi |
|---|---|
| `0016_phase2_trainer_venue_equipment.sql` | trainers, venues, equipment + assignment/booking tables |
| `0017_phase2_checklist_task_templates.sql` | checklist_templates, task_templates + `generate_event_checklist()` |
| `0018_phase2_issues.sql` | event_issues + `notify_critical_issue()` + re-create `assign_pic()` (+auto-generate checklist) |
| `0019_phase2_documents.sql` | Storage bucket `documents` (private) + RLS per event_id folder |
| `0020_phase2_participants.sql` | participants, participant_attendance + `log_participant_export()` (audit UU PDP) |
| `0021_phase2_change_requests.sql` | event_change_requests + `apply_change_request()` (whitelisted field, SQL injection-safe) |

**UI Phase 2 (baru Trainer/Venue/Equipment yang selesai):**
- `/master/trainers`, `/master/venues`, `/master/equipment` — CRUD lengkap, pola sama seperti
  Customer/Training/City (react-hook-form + Zod + Server Action).
- Commit: `1f027b7` (schema) dan `3898202` (UI Trainer/Venue/Equipment).

**Bug nyata yang ditemukan & diperbaiki saat verifikasi Phase 2:**
Semua 6 dialog master-data (Customer, Training, City, Trainer, Venue, Equipment) tidak
me-refresh list setelah create baru (`revalidatePath` di Server Action saja tidak cukup untuk
memaksa re-render Server Component yang sudah ter-mount tanpa event navigasi client). Fix:
tambahkan `useRouter()` + `router.refresh()` setelah `setOpen(false)` di semua 6 dialog.

**Email delivery notifikasi via Resend — SELESAI** (migration `0022_phase2_email_delivery.sql`,
commit `51b0f40`): `create_notification()` sekarang juga mengantrekan baris
`notification_deliveries` (channel=EMAIL, status=PENDING), kecuali user yang menonaktifkan email
di `notification_prefs`. `lib/services/email-service.ts` mengirim lewat Resend HTTP API (raw
fetch). `lib/services/notification-dispatch.ts` mengosongkan antrean PENDING pakai admin client,
dipanggil dari `submitEvent`/`callTransition`/`assignPic` (event-actions.ts) dan `createTask`
(task-actions.ts) tepat setelah RPC/insert-nya sukses — jadi pengiriman nyaris instan tanpa
perlu cron atau jembatan Postgres→HTTP (pg_net/Vault). Kegagalan kirim email ditelan, tidak
pernah menggagalkan aksi workflow yang memicunya. Sudah diverifikasi dengan pengiriman email
sungguhan lewat Resend API (200 OK, message id kembali) sebelum di-wire ke kode aplikasi.
Tidak ada integrasi WhatsApp — sesuai instruksi user, ditunda ke fase berikutnya.

**UI Template Checklist & Template Task — SELESAI**: `/master/checklist-templates` dan
`/master/task-templates` (list + dialog buat baru + halaman detail `[id]` untuk kelola item).
Checklist template punya kriteria opsional (training/tipe event/mode delivery/rentang peserta)
yang dipakai `find_checklist_template()` untuk memilih template paling cocok; task template
punya kriteria tipe event/mode delivery. Toggle aktif/nonaktif dan tambah/hapus item
diverifikasi langsung di browser (buat template → toggle nonaktif→aktif → tambah item →
hapus item, semua persist dengan benar). Write dibatasi `OPERATIONS_MANAGER`+`ADMIN` saja
(bukan `OPERATIONS`) sesuai RLS di `0017_phase2_checklist_task_templates.sql` — ini konfigurasi
level manajer, beda dari master data Trainer/Venue/Equipment yang boleh ditulis `OPERATIONS`
juga.

**FR-TSK-04 bulk-create task dari template — SELESAI**: `applyTaskTemplate(eventId, templateId)`
di `actions/task-actions.ts` menghitung `due_date` tiap item dari `days_before_event` terhadap
`start_date` event, lalu insert massal ke `event_tasks` dengan assignee = PIC event (template
sendiri generik, tidak tahu siapa yang menjalankan event tertentu). Dropdown "Terapkan
template..." muncul di tab Tasks pada Event Detail ([task-panel.tsx](app/(dashboard)/events/[id]/task-panel.tsx))
di samping tombol "+ Task", hanya untuk yang `canManage`. Diverifikasi end-to-end: buat event
test + template 2 item (H-7 dan H-2/wajib) → terapkan → kedua task muncul dengan tenggat yang
dihitung benar (2026-10-15 → H-7 jadi 2026-10-08, H-2 jadi 2026-10-13) → notifikasi in-app +
email terkirim (status SENT di `notification_deliveries`, dikonfirmasi lewat query langsung).
Semua data uji (event, template, role sementara) sudah dibersihkan setelah verifikasi.

**Event Detail — tab Checklist & Issues + perluasan gate `markReady()` — SELESAI**:
- Tab **Checklist** ([checklist-panel.tsx](app/(dashboard)/events/[id]/checklist-panel.tsx)) — daftar
  `event_checklists` dengan checkbox toggle done/undone (`actions/checklist-actions.ts`), badge
  "Wajib", ringkasan "X/Y item wajib selesai". Read-only untuk yang bukan PIC/OPERATIONS_MANAGER/ADMIN.
- Tab **Issues** ([issue-panel.tsx](app/(dashboard)/events/[id]/issue-panel.tsx)) — siapa saja bisa
  melaporkan issue (`+ Issue` dialog: judul/kategori/severity/PJ/deskripsi), sesuai RLS
  `event_issues_insert` yang memang terbuka untuk semua authenticated user (Sales yang melihat
  komplain customer tidak perlu role Ops untuk melaporkan). Update status (OPEN→IN_PROGRESS→
  RESOLVED→CLOSED) dibatasi PIC/OPERATIONS_MANAGER/ADMIN/MANAGEMENT. Menutup issue severity
  HIGH/CRITICAL mewajibkan Root Cause diisi (mencerminkan CHECK constraint DB
  `chk_event_issues_root_cause`), ditegakkan baik di UI maupun ditangkap sebagai pesan ramah
  jika lolos ke DB (`error.code === '23514'`).
- **`markReady()` di [event-actions.ts](actions/event-actions.ts) diperluas** (BR-EVT-08/
  BR-EVT-09/BR-CHK-02): sekarang mengecek tiga hal sekaligus sebelum mengizinkan transisi
  PREPARATION→READY — task wajib belum selesai, item checklist wajib belum selesai, DAN issue
  CRITICAL yang masih terbuka (status bukan RESOLVED/CLOSED). Ketiganya dikirim sebagai query
  paralel (`Promise.all`), pesan error spesifik per kondisi.

Diverifikasi end-to-end dengan skenario lengkap lewat UI sungguhan (bukan hanya lewat script):
buat customer+training+kota+event baru → submit → approve → assign PIC (perlu role
OPERATIONS_MANAGER sementara di akun admin test, dikembalikan lagi setelah selesai) → mulai
persiapan → tambah 1 checklist item wajib (belum dicentang) → coba "Tandai Siap" → **berhasil
diblokir** ("1 item checklist wajib belum selesai") → centang checklist selesai → lapor 1 issue
CRITICAL via UI → coba "Tandai Siap" lagi → **berhasil diblokir** ("1 issue CRITICAL masih
terbuka") → tutup issue dengan resolusi+root cause via UI → coba "Tandai Siap" lagi → **berhasil
transisi ke READY**. Semua data uji dan role sementara sudah dibersihkan.

**Event Detail — tab Resources (Trainer/Venue/Equipment assignment) — SELESAI**
([resources-panel.tsx](app/(dashboard)/events/[id]/resources-panel.tsx),
[assignment-actions.ts](actions/assignment-actions.ts)): tiga seksi (Trainer/Venue/Equipment)
dengan dialog "+ Trainer/Venue/Equipment", update status per baris, dan hapus (soft-delete).
Write dibatasi OPERATIONS/OPERATIONS_MANAGER/ADMIN (RLS `0016_phase2_trainer_venue_equipment.sql`
— siapa saja di Ops, tidak harus PIC event ini, beda dari Task/Issue).

**Warning konflik jadwal**: sebelum insert, dicek apakah trainer/venue yang sama sudah terikat
di event lain dengan rentang tanggal yang tumpang tindih (`datesOverlap()` helper, dibandingkan
terhadap `events.start_date/end_date` event lain via nested select). Untuk equipment, dicek sisa
stok (`total_quantity` dikurangi total quantity yang sudah terpakai di event lain yang tanggalnya
tumpang tindih). Jika ada konflik: **OPERATIONS_MANAGER/ADMIN bisa override** (assignment tetap
tersimpan, muncul toast warning "...di-override"); **OPERATIONS biasa diblokir keras** dengan
pesan minta eskalasi ke Ops Manager.

Diverifikasi end-to-end: buat 2 event dengan tanggal tumpang tindih (2026-12-01/02 dan
2026-12-02/03), assign trainer yang sama ke keduanya — assignment kedua **berhasil dengan toast
warning konflik** ("...di-override") karena akun test berrole ADMIN (otomatis punya hak
override). Booking venue dan assign equipment juga diverifikasi berhasil di event yang sama.
Semua data uji (2 event + trainer/venue/equipment percobaan, termasuk sisa data uji dari
verifikasi Trainer/Venue/Equipment di awal sesi) sudah dibersihkan.

**Event Detail — tab Documents — SELESAI** ([document-panel.tsx](app/(dashboard)/events/[id]/document-panel.tsx),
[document-actions.ts](actions/document-actions.ts)): upload file dilakukan langsung dari browser
ke Storage bucket privat `documents` (`lib/supabase/client.ts`, path `{event_id}/{uuid}-{filename}`
sesuai storage RLS di `0019_phase2_documents.sql`), lalu Server Action `recordDocumentUpload()`
mencatat metadata (tipe dokumen, nama file, ukuran, is_mandatory). Siapa saja yang bisa melihat
event boleh upload (RLS `documents_insert` tidak dibatasi role). Verifikasi/penolakan
(`updateDocumentVerification`) dibatasi PIC/OPERATIONS_MANAGER/ADMIN. Unduh dokumen memakai
signed URL (`getDocumentSignedUrl`, berlaku 60 detik) — tidak pernah lewat URL publik.

**Bug nyata ditemukan & diperbaiki saat verifikasi**: tombol "Unduh" awalnya memanggil
`window.open(url)` **setelah** `await` Server Action — di browser sungguhan ini kehilangan
konteks "user gesture" dan bisa diblokir popup blocker secara diam-diam. Fix: buka tab kosong
`window.open('', '_blank')` secara sinkron di awal handler (masih dalam gesture klik), baru set
`tab.location.href` setelah signed URL didapat.

Diverifikasi end-to-end: upload file teks nyata (via File API + DataTransfer, karena Browser pane
tidak punya dialog file picker native) → tersimpan di Storage + baris `documents` muncul dengan
status PENDING → signed URL yang dihasilkan berhasil di-fetch langsung dan mengembalikan isi file
yang benar (200 OK, konten cocok) → uji alur "Tolak" dengan alasan → status berubah ke REJECTED
dan alasan tampil di UI, tombol Verifikasi/Tolak otomatis hilang untuk dokumen yang sudah
diputuskan. Event uji, baris dokumen, dan objek Storage-nya sudah dihapus.

**Event Detail — tab Participants (UI Participant Management) — SELESAI**
([participant-panel.tsx](app/(dashboard)/events/[id]/participant-panel.tsx),
[participant-actions.ts](actions/participant-actions.ts)): tambah peserta manual, import massal
dari CSV dengan preview sebelum commit, tracking kehadiran per tanggal (checkbox per peserta,
tersimpan ke `participant_attendance` via upsert), dan export CSV yang otomatis memanggil
`log_participant_export()` (BR-PAR-03, audit trail wajib). Tab ini **tidak ditampilkan sama
sekali** untuk Sales (`canViewParticipants = isPic || OPERATIONS_MANAGER/ADMIN`) — sesuai UU PDP,
Sales hanya boleh lihat jumlah peserta agregat lewat `events.participant_count` yang sudah ada di
tab Overview, tidak pernah baris detail peserta.

**Keputusan: CSV, bukan Excel (.xlsx)** — sempat coba install package `xlsx` (SheetJS) untuk
memenuhi permintaan PRD "import Excel", tapi versi di npm registry punya 2 kerentanan
high-severity (prototype pollution + ReDoS) **tanpa fix tersedia** (SheetJS merilis versi
ter-patch hanya lewat CDN mereka sendiri, bukan npm). Diputuskan untuk uninstall dan pakai CSV
polos sebagai gantinya (parser/writer sendiri di [lib/utils/csv.ts](lib/utils/csv.ts), tanpa
dependency tambahan) — Excel bisa buka dan simpan CSV secara native jadi tidak kehilangan
kapabilitas nyata, dan menghindari menambahkan kerentanan yang tidak bisa di-patch ke aplikasi.
Header CSV yang dikenali fleksibel (Indonesia atau Inggris: Nama/full_name, Perusahaan/company,
dst).

Diverifikasi end-to-end: tambah 1 peserta manual → import CSV berisi 2 baris (termasuk satu nama
dengan koma di dalam tanda kutip, "Budi Santoso, S.T.", untuk menguji parser CSV menangani field
quoted dengan benar) → preview menampilkan 2 baris sebelum commit → konfirmasi → total jadi 3
peserta → centang kehadiran salah satu peserta → dikonfirmasi tersimpan benar di
`participant_attendance` (query langsung ke DB) dan tetap tercentang setelah reload halaman →
export CSV → dikonfirmasi baris `audit_logs` action=EXPORT dengan `row_count: 3` tercatat benar
(BR-PAR-03). Semua data uji (event, peserta, attendance, audit log) sudah dibersihkan.

**Event Detail — tab Perubahan (UI Event Change Request) — SELESAI**
([change-request-panel.tsx](app/(dashboard)/events/[id]/change-request-panel.tsx),
[change-request-actions.ts](actions/change-request-actions.ts)): siapa saja yang bisa lihat event
boleh mengajukan perubahan pada salah satu dari 5 field yang di-whitelist (`start_date`,
`end_date`, `location_name`, `participant_count`, `training_id`) — input "Nilai Baru" otomatis
berganti tipe (date/number/text/select training) sesuai field yang dipilih. `old_value` dibaca
dari baris event yang sesungguhnya di server (tidak dipercaya dari client). Persetujuan/penolakan
dibatasi OPERATIONS_MANAGER/ADMIN lewat RPC `apply_change_request()` yang sudah ada.

**Bug nyata di migration sebelumnya ditemukan & diperbaiki**: `apply_change_request()` (dari
`0021_phase2_change_requests.sql`, ditulis sebelumnya di sesi ini tapi baru sekarang benar-benar
dijalankan lewat UI) gagal setiap kali di-approve dengan error Postgres "CASE types text and
integer cannot be matched" — CASE expression yang mencoba mengembalikan `v_req.new_value::int`
di satu cabang dan `v_req.new_value` (text) di cabang lain tidak bisa disatukan tipenya oleh
Postgres. Diperbaiki lewat migration forward-fix baru
[0023_hotfix_apply_change_request_case_type.sql](supabase/migrations/0023_hotfix_apply_change_request_case_type.sql)
yang memecah jadi dua `execute ... using` terpisah (satu untuk `participant_count`/int, satu
untuk field text lainnya) — definisi fungsi lain diekstrak persis dari migration 0021 sebelum
diedit, sesuai disiplin anti-regresi sesi ini.

Diverifikasi end-to-end: ajukan perubahan `location_name` (text) → approve → **gagal dengan
error di atas** → migration hotfix di-push → coba approve lagi → **berhasil**, `location_name`
event benar-benar berubah di DB. Lalu ajukan perubahan `participant_count` (int) → approve →
berhasil, nilai jadi 35 di DB (membuktikan cabang integer juga sudah benar). Lalu ajukan
perubahan `start_date` → tolak dengan alasan → status jadi REJECTED, `start_date` event
terbukti **tidak berubah**. Notifikasi `CHANGE_REQUEST_APPROVED` juga terbukti tercatat benar
di tabel `notifications`. Semua data uji sudah dibersihkan.

### Phase 3 (Financial) — Stage A–H SELESAI (acceptance RPC 2026-09-14 hijau; sisa walkthrough UI browser + keputusan follow-up di §6)

User mengonfirmasi ICC memang menyelenggarakan **public class multi-customer** (satu event, banyak
customer berbeda yang masing-masing bayar per peserta) — ini keputusan kunci yang mengubah cara
Revenue Recognized dihitung untuk `event_type = 'PUBLIC'` (lihat plan file untuk detail model
dual-mode). Plan lengkap 8 stage (A–H) sudah disetujui user sebelum implementasi dimulai.

**Stage A — Financial master data (cost categories, vendors, approval thresholds) — SELESAI:**
- `supabase/migrations/0024_phase3_cost_categories_vendors_thresholds.sql` — tambah kolom
  `companies.settings jsonb`; tabel baru `cost_categories` (14 kategori di-seed dari §14.1:
  TRAINER_FEE, VENUE, CATERING, dst), `vendors`, `approval_thresholds` (kolom `context`
  `EXPENSE`/`BUDGET` membedakan dua use-case dalam satu tabel, `sort_order` sebagai rank tier).
  RLS: read terbuka untuk authenticated; write `cost_categories`/`approval_thresholds` dibatasi
  FINANCE/ADMIN, write `vendors` dibatasi OPERATIONS/OPERATIONS_MANAGER/FINANCE/ADMIN. Seed 6 baris
  approval_thresholds (4 tier EXPENSE dari §14.7 + 2 tier BUDGET, keduanya ditandai
  `[ASSUMPTION]` di PRD sendiri — belum dikonfirmasi user, lihat §6/§7 di bawah).
- `supabase/migrations/0025_phase3_company_settings_defaults.sql` — isi
  `companies.settings.expense_receipt_required_above = 100000` (sesuai angka PRD §14.2, meski
  ditandai `[OPEN QUESTION]` di PRD) dan `budget_required_above = 0` (asumsi paling aman: budget
  selalu wajib sebelum READY, bisa diubah Finance/Admin tanpa migration).
- `types/database.types.ts` diregenerasi (3077 baris, naik dari 2861).
- **Diverifikasi**: `npm run type-check` lulus; query langsung ke Supabase Cloud mengonfirmasi 14
  cost_categories dan 6 approval_thresholds ter-seed benar untuk company yang ada; RLS diuji nyata
  — user ADMIN berhasil insert 1 baris approval_threshold (201 Created), lalu baris uji tersebut
  **sudah dihapus** lewat REST API langsung (id `077a3354-3915-4a1e-b989-0171a6d58ca2`) sehingga
  tidak mencemari seed data produksi.
- Sudah di-commit.

**Stage B — Event Budgets (versioned) + `decide_budget()` — SELESAI:**
- `supabase/migrations/0026_phase3_event_budgets.sql` — tabel `event_budgets` (baris = satu versi,
  pola sama seperti `documents.version`) dengan `status` enum
  (`DRAFT/SUBMITTED/APPROVED/REJECTED/SUPERSEDED`), partial unique index memastikan maksimal 1 baris
  "in-flight" (DRAFT/SUBMITTED) dan maksimal 1 baris `APPROVED` per event pada satu waktu. Trigger
  `trg_event_budgets_set_version` menetapkan nomor versi otomatis (server-assigned, mengabaikan
  input klien) dan memaksa baris baru selalu mulai sebagai DRAFT. Tabel `event_budget_items`
  (kategori biaya + nominal rencana), dengan trigger `trg_recompute_event_budget_total` yang
  menjaga `event_budgets.total_amount` selalu berupa live sum dari item-nya (tidak pernah dipercaya
  dari client). Fungsi `resolve_approval_tier()` dan `resolve_approver_max_rank()` (dipakai bersama
  oleh Stage C nanti) me-lookup `approval_thresholds` untuk resolusi tier berbasis nominal dan rank
  approver. `submit_event_budget()` mengunci baris, memvalidasi ada minimal 1 item, lalu
  memberitahu role approver yang sesuai tier. `decide_budget()` memblokir self-approval (submitter
  ≠ approver, independen dari role) dan mem-verifikasi rank approver ≥ rank yang dibutuhkan
  (ADMIN selalu bisa override); approve pada versi baru otomatis men-supersede versi APPROVED
  sebelumnya.
- **Bug nyata ditemukan & diperbaiki dalam sesi verifikasi ini (belum sempat ter-push ke commit
  manapun sebelumnya sehingga diperbaiki langsung di file migration-nya, bukan lewat forward-fix
  terpisah)**: `submit_event_budget()` memakai `if v_tier is not null then ...` untuk membungkus
  loop notifikasi ke approver. Baris `approval_thresholds` yang di-resolve tier-nya punya kolom
  `created_by`/`updated_by` yang memang NULL (tidak pernah diisi saat seed) — dan menurut semantik
  SQL standar, ekspresi `ROW IS NOT NULL` hanya bernilai TRUE jika **SEMUA** field non-null; kalau
  campuran (sebagian null sebagian tidak), baik `IS NULL` maupun `IS NOT NULL` sama-sama bernilai
  FALSE. Akibatnya blok notifikasi **selalu di-skip secara diam-diam tanpa error** meskipun tier
  berhasil di-resolve dengan benar — sehingga approver tidak pernah menerima notifikasi
  `BUDGET_SUBMITTED` sama sekali di semua percobaan. Diperbaiki dengan mengecek field spesifik yang
  tidak pernah null saat match ditemukan (`v_tier.id is not null`), bukan seluruh row. Ditemukan
  lewat debugging bertahap (lihat komentar di migration): perbandingan antara `select count(*)`
  langsung (mengembalikan 1, benar) versus hasil FOR-loop yang dibungkus guard yang sama
  (mengembalikan 0) pada baris kode yang identik pada data yang identik — celah klasik row-NULL
  SQL yang layak diwaspadai di setiap tempat lain yang memakai pola serupa `if <composite var> is
  [not] null`.
- **Diverifikasi end-to-end penuh** (skenario nyata lewat RPC sungguhan ke Supabase Cloud, 2 user
  test tambahan dibuat lewat Admin Auth API — role OPERATIONS_MANAGER dan FINANCE — lalu dihapus
  lagi setelah selesai): buat draft v1 (Rp5jt, tier FINANCE) → tambah 2 item → total live
  ter-hitung otomatis 5.000.000 → submit → **notifikasi BUDGET_SUBMITTED terkirim ke FINANCE**
  (setelah fix) → coba self-approve sebagai submitter → **berhasil diblokir**
  (`CANNOT_APPROVE_OWN_SUBMISSION`) → coba approve sebagai OPERATIONS_MANAGER (bukan approver tier
  BUDGET) → **berhasil diblokir** (`INSUFFICIENT_APPROVAL_TIER`) → approve sebagai FINANCE →
  **berhasil**, status APPROVED → coba tambah item ke budget yang sudah APPROVED → **berhasil
  diblokir RLS** (immutable setelah diputuskan) → revisi (v2, Rp6jt) → submit → tolak dengan alasan
  sebagai FINANCE → status REJECTED, v1 tetap APPROVED tidak terganggu → revisi lagi (v3, Rp20jt,
  disubmit oleh OPERATIONS_MANAGER) → tier ter-resolve MANAGEMENT → FINANCE mencoba approve →
  **berhasil diblokir** (rank tidak cukup) → ADMIN approve (submitter ≠ ADMIN, bukan self-approval)
  → **berhasil**, v1 otomatis ber-flip ke SUPERSEDED, v3 jadi APPROVED satu-satunya versi aktif.
  Semua data uji (event, customer, training, 2 user + profile + role sementara, seluruh baris
  budget/item/notifikasi) sudah dibersihkan tuntas dari Supabase Cloud setelah verifikasi
  (dikonfirmasi lewat query count langsung: 0 event, 0 budget, 0 customer, 0 training tersisa).
- `scripts/stageb-verify.mjs` — dev utility baru (pola sama seperti `dev-set-admin-password.mjs`):
  helper `sql()`/`signIn()`/`rpc()` yang memakai Supabase Management API `database/query` endpoint
  untuk menjalankan SQL mentah langsung ke Supabase Cloud (butuh `SUPABASE_ACCESS_TOKEN` +
  `SUPABASE_PROJECT_REF` dari `.env.local`) — jauh lebih cepat untuk debugging DB function daripada
  lewat REST/RPC saja, dan akan dipakai lagi di verifikasi Stage C–H.
- Sudah di-commit.

**Stage C — Expenses + alur persetujuan berjenjang (§14.2/§14.3/§14.7, BR-FIN-01..08/14) — SELESAI:**
- `supabase/migrations/0027_phase3_expenses.sql` — tabel `expenses` (status
  `DRAFT/SUBMITTED/UNDER_REVIEW/APPROVED/REJECTED/PAID`, kolom `required_approver_role`/
  `required_tier_rank` dibekukan saat submit persis seperti didesain di plan, supaya edit tabel
  `approval_thresholds` nanti tidak mengubah expense yang sudah in-flight) + `expense_status_history`
  (pola sama persis `event_status_history`). `resolve_approval_tier()`/`resolve_approver_max_rank()`
  dari Stage B dipakai ulang apa adanya dengan `context='EXPENSE'` — tidak ada duplikasi.
- **BR-FIN-14 (eskalasi satu tingkat)**: `submit_expense()` mengunci baris **event** (bukan cuma
  baris expense) selama fungsi berjalan supaya dua submit bersamaan di kategori yang sama tidak
  bisa sama-sama lolos dari deteksi >15% dengan balapan; menghitung total terpakai kategori
  (SUBMITTED+UNDER_REVIEW+APPROVED+PAID) + expense ini terhadap `planned_amount` di
  `event_budget_items` untuk versi budget yang APPROVED; jika >15% di atas budget, tier naik **satu
  tingkat** dari tier berbasis nominal saja (bukan proporsional terhadap seberapa jauh
  pelanggarannya, sesuai bunyi literal PRD "naik satu tingkat"), dengan fallback tetap di tier
  tertinggi kalau sudah di puncak.
- **§14.7 "expense di luar budget kategori wajib justifikasi"**: kalau kategori biaya expense ini
  tidak punya baris di `event_budget_items` milik budget APPROVED saat ini (termasuk kasus belum
  ada budget APPROVED sama sekali), `submit_expense()` mewajibkan `justification_note` terisi.
- **BR-FIN-06 (bukti wajib di atas ambang)** ditegakkan oleh trigger `guard_expense_receipt_required`
  di transisi DRAFT→SUBMITTED (bukan di insert, sesuai desain plan), baca ambang dari
  `companies.settings->>'expense_receipt_required_above'` (Stage A, default Rp100.000).
- **BR-FIN-07/E11 (tolak expense di event CLOSED)** ditegakkan **dua lapis**: trigger
  `guard_expense_event_state` (BEFORE INSERT, blokir baris DRAFT baru sama sekali) DAN pengecekan
  inline di awal `submit_expense()` (blokir draft lama yang baru mau di-submit setelah event-nya
  sempat CLOSED — celah yang tidak tertutup kalau hanya mengandalkan guard INSERT-only, ditemukan
  saat menyusun test plan, bukan lewat trial-and-error di produksi).
- **Gap dari plan Stage A yang baru bisa ditutup sekarang**: trigger
  `guard_cost_category_deactivation` (BEFORE UPDATE di `cost_categories`) mencegah set
  `is_active=false` selama kategori itu masih dipakai `event_budget_items` ATAU `expenses` — tidak
  bisa dibuat di Stage A karena tabel `expenses` belum ada saat itu.
- **`decide_expense()`**: blokir self-approval (BR-FIN-04/D12, independen dari role, dicek sebelum
  cek tier apa pun) → cek rank approver ≥ `required_tier_rank` yang sudah dibekukan (ADMIN selalu
  override) → approve/reject + catat `expense_status_history` + notifikasi ke pengaju (N25). Saat
  approve, **§14.5 variance alert** dihitung ulang terpisah dari eskalasi submit (pakai actual
  APPROVED+PAID saja sesuai definisi BR-FIN-03, bukan termasuk SUBMITTED/UNDER_REVIEW) — kalau masih
  >15% di atas budget, kirim notifikasi `BUDGET_VARIANCE_ALERT` ke semua pemegang role
  OPERATIONS_MANAGER dan FINANCE (bukan cuma approver expense ini), sesuai §14.5 yang eksplisit
  menyebut kedua role itu sebagai penerima alert.
- **`mark_expense_under_review()`**: transisi ringan SUBMITTED→UNDER_REVIEW, tidak mengubah apa pun
  soal siapa yang berhak memutuskan nanti (opsional/informational sesuai PRD, `decide_expense()`
  menerima baik SUBMITTED maupun UNDER_REVIEW sebagai status yang bisa diputuskan).
- **`mark_expense_paid()`**: FINANCE/ADMIN saja, syarat status APPROVED.
- **E12 (expense ditolak → revisi sebagai versi baru, bukan menimpa)** sengaja **tidak** memakai
  mekanisme versioning bergaya `event_budgets` — baris yang REJECTED dibiarkan apa adanya sebagai
  riwayat, dan pengguna cukup membuat baris `expenses` baru untuk percobaan berikutnya (tabel ini
  memang sudah banyak baris per event secara alami, beda dari budget yang cuma satu APPROVED per
  event, jadi tidak perlu nomor versi maupun partial unique index).
- **RLS**: SALES/SALES_MANAGER **tidak** diberi akses langsung ke tabel `expenses` sama sekali
  (baca §23.1/§23.2 PRD: Sales hanya boleh lihat *total* actual cost, tidak pernah rincian per
  baris — agregat itu akan dilayani fungsi Stage D yang SECURITY DEFINER, bukan lewat akses tabel
  langsung). OPERATIONS dibatasi ke event miliknya sendiri (PIC/backup-PIC), OPERATIONS_MANAGER/
  FINANCE/ADMIN penuh, MANAGEMENT diberi akses SELECT (perlu melihat expense >Rp15jt yang jadi
  wewenang approvalnya) tapi tidak insert/update/delete (MANAGEMENT tidak pernah mengajukan expense
  sesuai matriks §23.1).
- **Diverifikasi end-to-end penuh**: 23 skenario nyata lewat RPC sungguhan ke Supabase Cloud (3 user
  test baru — OPERATIONS/OPERATIONS_MANAGER/FINANCE — dibuat lewat Admin Auth API lalu dihapus lagi
  setelah selesai), semua 23 lolos setelah dua putaran perbaikan **skrip uji** (bukan bug produk):
  jumlah expense uji awal ternyata melebihi ambang bukti Rp100.000 sehingga perlu lampiran dulu
  (perilaku yang benar), dan satu skenario tier salah memakai aktor yang sama dengan pengaju
  sehingga kena self-approval-block duluan sebelum sempat menguji tier. Cakupan: justifikasi wajib
  tanpa budget → submit dengan justifikasi → self-approve diblokir → tier lebih tinggi (FINANCE)
  boleh approve tier lebih rendah (OPERATIONS) → tier lebih rendah diblokir approve tier lebih
  tinggi → bukti wajib di atas ambang (gagal tanpa lampiran, berhasil setelah dilampirkan) → tolak
  tanpa alasan diblokir → tolak dengan alasan berhasil → mark-paid ditolak untuk status
  bukan-APPROVED dan untuk role bukan FINANCE/ADMIN, berhasil untuk FINANCE pada status APPROVED →
  alur under-review → insert expense baru di event CLOSED diblokir trigger → submit draft lama
  setelah event CLOSED diblokir inline check → eskalasi BR-FIN-14 mengangkat tier OPERATIONS_MANAGER
  ke FINANCE saat kategori terlampaui >15% → tier dasar (sebelum eskalasi) diblokir approve →
  alert variance terkirim ke OPERATIONS_MANAGER+FINANCE setelah approve → deaktivasi cost category
  yang masih dipakai diblokir. Semua data uji sudah dibersihkan tuntas (dikonfirmasi 0 event, 0
  expense, 0 budget, 0 customer, 0 training tersisa lewat query count langsung).
- Sudah di-commit.

**Stage D — Revenue model (§14.3/§14.4/§14.5, BR-FIN-03/11, D14/D17) — SELESAI:**
- `supabase/migrations/0028_phase3_revenue.sql` — `events.is_promotional` (D17/E25, dikecualikan
  dari analisis margin di laporan nanti, bukan dari kalkulasi itu sendiri) +
  `events.revenue_recognized_amount` (null sampai `COMPLETED`, dibekukan setelahnya). 4 kolom baru
  di `participants`: `unit_price`, `billing_status` (`CONFIRMED/CANCELLED/WAIVED`, default
  CONFIRMED), `payment_status` (`UNPAID/INVOICED/PARTIAL/PAID`, default UNPAID),
  `billing_customer_id` (FK `customers`, nullable — peserta walk-in public class belum tentu punya
  master data customer).
- **`compute_event_revenue()`**: cabang `event_type='PUBLIC'` → `sum(unit_price)` peserta
  `billing_status='CONFIRMED'`; tipe event lain → `events.sales_value` apa adanya (persis keputusan
  #3 di plan). Dipakai dua kali dengan wewenang berbeda — lihat poin berikutnya.
- **Pola "two-arg trusted bypass"** untuk mengatasi konflik otorisasi: `transition_event_status()`
  harus bisa memanggil `compute_event_revenue()` untuk MEMBEKUKAN angka saat `COMPLETED`, tapi aturan
  visibilitas finansial (lihat poin berikutnya) tidak selalu cocok dengan siapa saja yang menurut
  aturan Phase 1 boleh men-transisi event ke COMPLETED (mis. sembarang user ber-role OPERATIONS,
  bukan cuma PIC event itu — celah lama dari Phase 1 yang sengaja TIDAK diubah di sini). Solusinya:
  `compute_event_revenue(uuid, boolean)` (2 argumen, argumen kedua `p_skip_auth`) berisi kalkulasi
  aslinya dan **di-revoke total dari `authenticated`/`anon`** supaya klien mana pun tidak bisa
  memanggilnya langsung dengan `p_skip_auth=true` untuk melewati pengecekan; fungsi 1-argumen
  `compute_event_revenue(uuid)` yang publik selalu memanggil versi 2-argumen dengan `false` (selalu
  menegakkan pengecekan). `transition_event_status()` sendiri (jalan sebagai pemilik fungsi,
  kebal terhadap REVOKE tadi) memanggil versi 2-argumen dengan `true` karena otorisasi "siapa boleh
  men-transisi ke COMPLETED" sudah ditegakkan di level yang lebih tinggi oleh fungsi itu sendiri.
  Diverifikasi eksplisit: percobaan RPC langsung ke `compute_event_revenue(id, true)` sebagai user
  biasa **ditolak** ("permission denied for function") — hanya jalur 1-argumen yang bisa diakses.
- **`compute_event_costs()`** (§14.3, tiga angka berdampingan: Actual=APPROVED+PAID,
  Pending=SUBMITTED+UNDER_REVIEW, Projected=jumlah keduanya) dan **`compute_budget_variance()`**
  (§14.5, per kategori: `variance_pct` dan band `NO_BUDGET/UNDER/ON_BUDGET/OVER/ALERT` berdasarkan
  ambang −5%/+5%/+15%) — keduanya `security definer` dengan pengecekan otorisasi sendiri via helper
  baru `can_view_event_financials()`.
- **Bug nyata ditemukan & diperbaiki dalam sesi verifikasi ini** (belum sempat commit, jadi
  diperbaiki langsung di file migration seperti halnya bug Stage B):
  `compute_budget_variance()`'s subquery menulis `select cost_category_id, ... group by
  cost_category_id from expenses` tanpa qualifier tabel — karena fungsi ini punya OUT parameter
  bernama persis sama (`cost_category_id`, dari `returns table(cost_category_id uuid, ...)`),
  Postgres tidak bisa menentukan apakah referensi itu mengacu ke kolom `expenses.cost_category_id`
  atau ke variabel OUT parameter, dan gagal dengan error eksplisit "column reference
  \"cost_category_id\" is ambiguous". **Beda dengan bug Stage B** (yang gagal SENYAP tanpa error),
  bug kelas ini justru selalu error keras — lebih mudah ditangkap, tapi tetap layak diwaspadai:
  **jangan pernah memakai nama kolom bare di dalam fungsi yang punya OUT parameter/kolom hasil
  dengan nama yang sama** — selalu qualify dengan alias tabel. Diperbaiki dengan alias eksplisit
  (`expenses ex_raw`, semua kolom lewat `ex_raw.xxx`).
- **Gap RLS Phase 1 ditemukan & ditutup**: `events_select` (dari `0008_rls_policies.sql`, tidak
  pernah disentuh sejak Phase 1 saat role FINANCE masih "non-aktif") tidak menyertakan FINANCE di
  daftar role yang boleh baca semua event — berarti user FINANCE akan mendapat 0 baris di halaman
  mana pun yang query tabel `events` langsung, padahal seluruh UI Financial Phase 3 (Stage G nanti)
  pasti butuh ini. Kebijakan di-drop+create ulang menambahkan FINANCE ke cabang akses penuh
  (sejajar ADMIN/MANAGEMENT/OPERATIONS_MANAGER). Diverifikasi langsung: query `select` ke tabel
  `events` sebagai user FINANCE sungguhan (bukan cuma lewat fungsi `security definer`) berhasil
  mengembalikan baris yang sebelumnya pasti kosong.
- **Visibilitas finansial (BR-FIN-15, §23.2)**: `can_view_event_financials()` memberi akses penuh ke
  ADMIN/MANAGEMENT/OPERATIONS_MANAGER/FINANCE, PIC/backup-PIC OPERATIONS untuk event miliknya, dan
  SALES/SALES_MANAGER **hanya untuk event mereka sendiri/tim mereka** (lebih ketat dari
  `events_select` yang mengizinkan Sales melihat SEMUA event demi keperluan non-finansial) — sesuai
  §23.2 "Sales boleh lihat actual cost, tapi hanya total, untuk event miliknya".
- **Diverifikasi end-to-end penuh**: 22 skenario nyata lewat RPC sungguhan (4 user test baru — 2
  SALES, 1 OPERATIONS_MANAGER, 1 FINANCE — dibuat lalu dihapus lagi). Cakupan: revenue INHOUSE =
  sales_value → transisi ke COMPLETED membekukan angka → edit sales_value setelahnya tidak mengubah
  angka yang sudah beku (live recompute tetap mencerminkan angka baru, tapi kolom beku tidak
  berubah) → revenue PUBLIC = jumlah unit_price peserta CONFIRMED (mengecualikan yang CANCELLED) →
  pola beku yang sama untuk PUBLIC → Sales bukan pemilik event ditolak, Sales pemilik event
  berhasil, FINANCE berhasil untuk event siapa pun → percobaan panggil langsung fungsi 2-argumen
  ditolak → FINANCE berhasil query tabel `events` langsung (bukti fix RLS) → Actual/Pending/
  Projected cost cocok dengan status expense campuran → variance per kategori cocok (budget 2.5jt
  vs actual 3jt = 20% = band ALERT). Semua data uji dibersihkan tuntas (dikonfirmasi 0 event, 0
  expense, 0 budget, 0 participant, 0 customer, 0 training tersisa).
- Sudah di-commit.

**Stage E — Financial Closing (§14.6/§14.8, BR-FIN-08/09/10/12) — SELESAI:**
- `supabase/migrations/0029_phase3_financial_closing.sql` — tabel `financial_closings` (boleh
  banyak baris per event: close→reopen→close lagi = baris BARU, baris lama tidak pernah ditimpa,
  konsisten dengan D21 "data pembatalan disimpan selamanya"). Kolom `margin_health` pakai enum
  `margin_health_band` (`GREEN/YELLOW/RED/NEGATIVE`, boleh NULL untuk kasus tepi revenue=0 dan
  cost=0 sekaligus — tidak bisa dinilai).
- **`apply_financial_closing()`** (pola wrapper sama persis `assign_pic()`: kerjakan hal spesifik
  closing dulu, baru panggil `transition_event_status(id,'CLOSED')` di akhir, bukan menambah cabang
  khusus ke fungsi generik itu): cek role FINANCE/ADMIN → cek status event = `FINANCIAL_CLOSING` →
  cek `revenue_recognized_amount` sudah terisi (BR-FIN-11, harusnya otomatis lewat Stage D) → cek
  BR-FIN-08 tidak ada expense SUBMITTED/UNDER_REVIEW → cek BR-FIN-08 semua dokumen wajib sudah
  VERIFIED → hitung profit/margin dari `compute_event_costs()` (dipakai ulang dari Stage D) → cek
  BR-FIN-12 margin negatif wajib `negative_margin_explanation` → insert snapshot `financial_closings`
  → panggil `transition_event_status(id,'CLOSED')`. Invoice **sengaja tidak** dijadikan syarat keras
  (PRD sendiri menandai timing invoice `[OPEN QUESTION]`, sesuai keputusan #9 di plan).
- **`transition_event_status()` recreate ke-5** (diekstrak persis dari `0028_phase3_revenue.sql`
  sebelum diedit): menambah stempel `financial_closings.reopened_by/at/reason` (BR-FIN-10) pada
  baris closing TERAKHIR yang belum pernah di-reopen, tepat saat cabang reopen (`CLOSED` →
  status lain) benar-benar berhasil — bukan menimpa baris lama, hanya menambah 3 kolom stempel ke
  baris yang sudah ada.
- **Diverifikasi end-to-end penuh**: 22 skenario nyata lewat RPC sungguhan (3 user test baru —
  OPERATIONS_MANAGER, FINANCE, MANAGEMENT — dibuat lalu dihapus lagi). Cakupan: dokumen wajib belum
  VERIFIED → diblokir → expense masih SUBMITTED → diblokir → role selain FINANCE/ADMIN → diblokir →
  closing berhasil dengan snapshot benar (revenue 10jt, actual cost 3jt setelah 1 expense direjeksi,
  profit 7jt, margin 70%, band GREEN) → event benar-benar berstatus CLOSED → expense baru di event
  yang baru saja CLOSED tetap diblokir guard Stage C yang sudah ada → reopen tanpa alasan diblokir →
  reopen oleh OPERATIONS_MANAGER (bukan FINANCE/MANAGEMENT/ADMIN) diblokir dengan `EVENT_CLOSED_TERMINAL`
  → reopen oleh MANAGEMENT dengan alasan berhasil, kembali ke `FINANCIAL_CLOSING` → baris
  `financial_closings` benar-benar ter-stempel `reopened_by/at/reason` → closing lagi setelah reopen
  berhasil membuat baris BARU (2 baris total untuk event yang sama), baris lama tetap menyimpan
  stempel reopen-nya utuh → skenario kedua: margin negatif tanpa penjelasan diblokir, dengan
  penjelasan berhasil dengan `margin_health = NEGATIVE`. **22/22 lolos pada percobaan pertama**
  (tidak ada bug baru ditemukan di stage ini). Semua data uji dibersihkan tuntas.
- Sudah di-commit.

**Stage F — Zod schemas + Server Actions untuk entitas finansial (murni lapisan pemanggilan,
belum ada UI) — SELESAI:**
- `lib/validations/{cost-category,vendor,budget,expense}.ts` — 4 skema Zod baru, mengikuti pola
  persis `master-data.ts`/`issue.ts` yang sudah ada (`.optional().or(z.literal(""))` untuk field
  opsional dari form, `.uuid("pesan")` untuk FK wajib, `z.enum([...])` untuk enum).
- `actions/vendor-actions.ts` — CRUD vendor (create/update/deactivate), pola CRUD persis
  `master-data-actions.ts`/`template-actions.ts`, `requireRole` disamakan dengan RLS
  `vendors_write` (OPERATIONS/OPERATIONS_MANAGER/FINANCE/ADMIN).
- `actions/financial-actions.ts` — CRUD cost category (`requireRole("FINANCE","ADMIN")`, disamakan
  dengan RLS `cost_categories_write`), plus 3 wrapper baca `compute_event_revenue/costs/
  budget_variance()` (otorisasi ditegakkan DI DALAM RPC lewat `can_view_event_financials()`,
  Server Action di sini hanya `requireAuth()` — tidak menduplikasi logika visibilitas), plus
  `applyFinancialClosing()` yang membungkus `apply_financial_closing()`.
- `actions/budget-actions.ts` — `createEventBudget` (insert budget + item sekaligus, dengan
  cleanup best-effort kalau insert item gagal supaya tidak menyisakan draft kosong yang mengunci
  slot "satu budget in-flight per event"), `deleteEventBudgetDraft`, `submitEventBudget`,
  `decideEventBudget` — membungkus `submit_event_budget()`/`decide_budget()` (Stage B).
- `actions/expense-actions.ts` — `createExpense`, `deleteExpenseDraft`, `submitExpense`,
  `markExpenseUnderReview`, `decideExpense`, `markExpensePaid` — membungkus RPC-RPC Stage C.
- `actions/event-actions.ts` (diperluas) — 2 fungsi baru `startFinancialClosing()` dan
  `reopenClosedEvent()`, memakai ulang helper privat `callTransition()` yang sudah ada persis
  seperti `markPostEvent()` dkk — transisi status event tetap satu-satunya lewat
  `transition_event_status()`, tidak ada jalur baru.
- **Pola mapping error RPC → pesan ramah (kriteria eksplisit dari plan)**: sebelum stage ini,
  **tidak ada** utility mapping generik di codebase — satu-satunya presedens adalah satu blok
  `if (error.code === "23514")` di `issue-actions.ts`. Stage F memperkenalkan `mapBudgetError()`/
  `mapExpenseError()`/`mapFinancialError()` (fungsi privat per file, tidak diekspor — file
  `"use server"` hanya boleh mengekspor async function), masing-masing sebuah `switch` yang
  mencocokkan **pesan** RAISE EXCEPTION (bukan `errcode`, karena error-error kustom ini memang
  dikodekan sebagai teks pesan, lihat §7) dari migration 0026-0029, dengan fallback ke
  `error.message` mentah untuk apa pun yang belum dipetakan.
- **Diverifikasi end-to-end** lewat harness sementara: route diagnostik `/api/dev-stage-f-test`
  (dihapus lagi setelah verifikasi, tidak pernah di-commit) yang memanggil Server Action
  sungguhan lewat dev server Next.js asli (bukan simulasi) — dibutuhkan karena fungsi
  `"use server"` bergantung pada `cookies()` dari konteks request nyata, tidak bisa dipanggil dari
  skrip Node polos seperti Stage A-E. Login bergantian sebagai 3 user (OPERATIONS_MANAGER, FINANCE,
  ADMIN test) lewat browser pane sungguhan. Cakupan: semua 4 skema Zod (valid & invalid, termasuk
  psan field error Indonesia) → createVendor sebagai OPS_MGR berhasil → createCostCategory sebagai
  OPS_MGR **diblokir `requireRole` (redirect)**, sebagai FINANCE berhasil → createEventBudget +
  submitEventBudget sebagai OPS_MGR berhasil → self-approve budget sebagai OPS_MGR **diblokir
  dengan pesan ramah** → approve sebagai FINANCE berhasil → createExpense+submitExpense sebelum
  budget disetujui **diblokir dengan pesan justifikasi ramah** → submit ulang setelah budget
  disetujui berhasil → self-approve expense (submitter=FINANCE, actor=FINANCE) **diblokir dengan
  pesan ramah** → decide sebagai ADMIN berhasil → markExpensePaid sebagai ADMIN berhasil →
  getEventCosts/getEventRevenue/getBudgetVariance mengembalikan angka yang benar (actual 50rb,
  revenue 10jt, variance band UNDER) → applyFinancialClosing pada event berstatus salah
  **ter-mapping ke pesan ramah** → deactivateCostCategory pada kategori yang masih dipakai
  **ter-mapping ke pesan ramah**. Semua data uji (event, customer, training, vendor, cost category,
  2 user test) dibersihkan tuntas (dikonfirmasi `cost_categories` kembali ke 14 baris seed asli,
  0 event/vendor/customer/training tersisa).
- `.claude/launch.json` — konfigurasi dev server baru (`npm run dev`, port 3000) untuk Browser pane
  — akan dipakai lagi untuk walkthrough penuh di Stage G.
- Sudah di-commit.

**Stage G — UI Financial (master data + tab Event Detail) — SELESAI:**
Stage pertama di Phase 3 yang punya tampilan — Stage A–F sebelumnya murni database + Server Action.

- **Master data**: 3 halaman baru di bawah `/master` — `cost-categories`, `vendors`,
  `approval-thresholds` — pola CRUD persis `checklist-templates`/`trainers` (list + dialog create +
  tombol nonaktifkan per baris). `approval-thresholds` butuh skema Zod + Server Action baru
  (`lib/validations/approval-threshold.ts`, CRUD ditambahkan ke `financial-actions.ts`) — item ini
  tidak ada di Stage F karena UI master data threshold memang baru dibutuhkan sekarang.
- **`actions/expense-actions.ts` diperluas**: `updateExpense()` dan `attachExpenseReceipt()` —
  keduanya gap nyata dari Stage F (tidak ada cara mengubah expense DRAFT setelah dibuat, termasuk
  melampirkan bukti belakangan). `attachExpenseReceipt()` dipakai untuk picker inline di tabel
  expense (pola sama seperti status-Select inline di `resources-panel.tsx`).
- **Tab "Financial" baru di Event Detail** (`financial-panel.tsx`, 4 sub-bagian dalam satu file,
  pola sama persis `resources-panel.tsx`): Budget (builder multi-item dinamis, submit, approve/
  reject dengan dialog alasan), Expense (form lengkap react-hook-form, inline attach-receipt,
  submit/under-review/approve/reject/mark-paid), Ringkasan Finansial (Revenue/Actual/Pending/
  Projected + tabel variance per kategori dari `getEventCosts/getEventRevenue/getBudgetVariance`),
  Financial Closing (checklist prasyarat, tombol tutup, snapshot closing terakhir).
- **`event-actions-panel.tsx` diperluas** (bukan file baru — transisi status generik tetap satu
  tempat): tombol "Mulai Financial Closing" (POST_EVENT→FINANCIAL_CLOSING, FINANCE/ADMIN) dan
  "Buka Kembali Event" dengan dialog alasan (CLOSED→FINANCIAL_CLOSING, FINANCE/MANAGEMENT/ADMIN).
  `applyFinancialClosing()` sendiri (prasyarat closing + snapshot) tetap tinggal di tab Financial
  karena itu domain-specific, bukan transisi status generik.
- **Gap yang sengaja DITUNDA, bukan di-skip diam-diam**: PRD §23.2 bilang Sales boleh lihat *total*
  actual cost untuk event miliknya sendiri (beda dari margin yang eksplisit "untuk event miliknya
  sendiri" juga). Tab Financial versi ini **menyembunyikan seluruh tab dari Sales/Sales Manager**
  (tidak ada versi "total saja" yang lebih ringkas) — `canViewFinancial` di `page.tsx` hanya
  mengizinkan OPERATIONS-PIC/backup-PIC, OPERATIONS_MANAGER, FINANCE, MANAGEMENT, ADMIN. Ini
  konsisten dengan cara `expenses`/RLS Stage C dirancang (Sales memang tidak pernah diberi akses
  tabel `expenses` langsung), tapi belum memenuhi PRD 100%. Dicatat sebagai item follow-up, bukan
  bug — perlu keputusan eksplisit user sebelum dibangun (butuh UI baru "total saja", bukan sekadar
  gate ulang tab yang sudah ada).
- **Diverifikasi end-to-end penuh lewat browser sungguhan** (bukan RPC langsung seperti Stage
  A–F — ini murni UI, jadi walkthrough browser adalah bukti yang benar): login sebagai ADMIN →
  ketiga halaman master data baru menampilkan data seed yang benar (14 cost category, 6 approval
  threshold) → buat vendor baru lewat dialog, tersimpan & muncul di list → buka tab Financial event
  uji → buat budget draft 1 item (Venue, Rp2jt) lewat dialog dinamis → ajukan → **self-approve
  sebagai ADMIN (pengaju) diblokir dengan pesan ramah** → login sebagai user FINANCE test lain →
  approve budget berhasil, kartu "Budget Disetujui" + tabel variance muncul otomatis → ajukan
  expense (Rp50rb, kategori Venue) sebagai FINANCE → **self-approve sebagai FINANCE (pengaju)
  diblokir** (dikonfirmasi lewat query DB langsung: `status=SUBMITTED, decided_by=null`) → login
  balik sebagai ADMIN → approve expense berhasil → Ringkasan Finansial (Actual/Pending/Projected)
  dan tabel variance ter-update otomatis tanpa reload manual → tandai dibayar berhasil, status akhir
  "Dibayar". Semua angka di layar dicocokkan dan sesuai dengan hitungan manual. Data uji (event,
  customer, training, vendor, 1 user test) sudah dibersihkan tuntas.
- **Catatan teknis Browser pane**: Base UI `Select` popup tidak bisa diklik lewat koordinat piksel
  saat pane berjalan di background/tidak ter-composite visual (`computer` tool klik ke opsi
  dropdown gagal — "outside viewport" meski elemen ada di accessibility tree). Workaround yang
  konsisten berhasil: `javascript_tool` men-cari elemen `[role="option"]`/`[role="combobox"]` lewat
  `document.querySelectorAll` lalu `.click()` langsung — dipakai di semua interaksi Select selama
  verifikasi stage ini setelah percobaan `computer`/keyboard-navigation gagal.
- Sudah di-commit.

## 2. File yang Berubah (Phase 2, sesi ini)

```
supabase/migrations/0016_phase2_trainer_venue_equipment.sql   (baru)
supabase/migrations/0017_phase2_checklist_task_templates.sql  (baru)
supabase/migrations/0018_phase2_issues.sql                    (baru)
supabase/migrations/0019_phase2_documents.sql                 (baru)
supabase/migrations/0020_phase2_participants.sql              (baru)
supabase/migrations/0021_phase2_change_requests.sql           (baru)
supabase/migrations/0022_phase2_email_delivery.sql             (baru)
supabase/migrations/0023_hotfix_apply_change_request_case_type.sql (baru — forward-fix)
lib/validations/master-data.ts                                (+trainerSchema, venueSchema, equipmentSchema)
actions/master-data-actions.ts                                (+createTrainer, createVenue, createEquipment)
app/(dashboard)/master/layout.tsx                              (+tab Trainer/Venue/Equipment/Checklist/Task template)
app/(dashboard)/master/trainers/page.tsx, trainer-dialog.tsx   (baru)
app/(dashboard)/master/venues/page.tsx, venue-dialog.tsx       (baru)
app/(dashboard)/master/equipment/page.tsx, equipment-dialog.tsx (baru)
app/(dashboard)/master/customers/customer-dialog.tsx           (+router.refresh() fix)
app/(dashboard)/master/cities/city-dialog.tsx                  (+router.refresh() fix)
app/(dashboard)/master/trainings/training-dialog.tsx            (+router.refresh() fix)
types/database.types.ts                                        (regenerated, 2861 baris)
scripts/dev-set-admin-password.mjs                              (dev utility)
```

Working tree bersih (`git status --short` kosong) per commit terakhir `0b085b8` (akhir Phase 2).

## 2b. File yang Berubah (Phase 3 Stage A–G, sesi ini — sudah di-commit)

```
supabase/migrations/0024_phase3_cost_categories_vendors_thresholds.sql (baru, Stage A)
supabase/migrations/0025_phase3_company_settings_defaults.sql          (baru, Stage A)
supabase/migrations/0026_phase3_event_budgets.sql                      (baru, Stage B)
supabase/migrations/0027_phase3_expenses.sql                           (baru, Stage C)
supabase/migrations/0028_phase3_revenue.sql                            (baru, Stage D)
supabase/migrations/0029_phase3_financial_closing.sql                  (baru, Stage E)
types/database.types.ts                                                (regenerated, 3859 baris)
scripts/stageb-verify.mjs                                              (dev utility baru, Stage B, dipakai ulang di Stage C/D/E)
lib/validations/cost-category.ts                                       (baru, Stage F)
lib/validations/vendor.ts                                              (baru, Stage F)
lib/validations/budget.ts                                              (baru, Stage F)
lib/validations/expense.ts                                             (baru, Stage F)
lib/validations/approval-threshold.ts                                  (baru, Stage G)
actions/vendor-actions.ts                                              (baru, Stage F)
actions/budget-actions.ts                                              (baru, Stage F)
actions/expense-actions.ts                                             (baru Stage F, +updateExpense/+attachExpenseReceipt Stage G)
actions/financial-actions.ts                                           (baru Stage F, +approval-threshold CRUD Stage G)
actions/event-actions.ts                                               (+startFinancialClosing, +reopenClosedEvent, Stage F)
app/(dashboard)/events/[id]/event-actions-panel.tsx                    (+tombol Financial Closing/Reopen, Stage G)
app/(dashboard)/events/[id]/page.tsx                                   (+tab Financial + 5 query baru, Stage G)
app/(dashboard)/events/[id]/financial-panel.tsx                        (baru, Stage G)
app/(dashboard)/master/layout.tsx                                      (+3 tab nav, Stage G)
app/(dashboard)/master/cost-categories/                                (baru, Stage G)
app/(dashboard)/master/vendors/                                        (baru, Stage G)
app/(dashboard)/master/approval-thresholds/                            (baru, Stage G)
.claude/launch.json                                                    (baru, Stage F — dev server config untuk Browser pane)
```

## 3. Keputusan Arsitektur Penting

- **RLS sebagai lapisan otorisasi utama**, bukan hanya pengecekan di UI — sesuai prinsip PRD.
- **Event ID (`EVT-YYYY-NNNNNN`)** sebagai business key, dibuat via counter atomik di Postgres.
- **State machine status event** hanya bisa berubah lewat fungsi `transition_event_status()`
  (SECURITY DEFINER), dijaga trigger guard berbasis GUC `emocs.allow_status_transition` — update
  langsung ke kolom `status` ditolak oleh trigger.
- **Notifikasi dipicu dari dalam fungsi/trigger DB terpercaya** (mis. `notify_event_status_change`,
  `notify_task_assigned`, `notify_critical_issue`), bukan langsung dari TypeScript client — supaya
  tidak bisa dilewati.
- **`public.has_role()` / `public.has_any_role()`** (bukan `auth.has_role`) — role Postgres di
  project ini tidak punya CREATE di schema `auth`.
- **Base UI, bukan Radix** — semua komponen shadcn/ui pakai `render={<Element/>}`, bukan `asChild`.
  `Select` butuh prop `items={[{value,label}]}` supaya label ter-resolve dengan benar.
- **Disiplin migration**: tidak pernah retype ulang definisi fungsi dari ingatan saat re-declare
  fungsi yang sudah benar di migration sebelumnya — selalu extract definisi persis via
  `sed`/grep dari migration terakhir yang diketahui benar (lihat §5, pernah terjadi regresi nyata).
- **Notifikasi Phase 2: email-only untuk saat ini** — instruksi eksplisit user: "untuk Notifikasi
  sementara melalui email saja, kedepan baru menggunakan WA". **WhatsApp TIDAK boleh dibangun di
  fase ini.**
- **UU PDP No. 27/2022** membatasi akses data peserta (participants) hanya untuk PIC-event/
  Operations Manager/Admin — Sales sengaja dikecualikan di RLS `0020_phase2_participants.sql`,
  dan setiap export wajib tercatat lewat `log_participant_export()`.

### Keputusan Arsitektur Phase 3 (ringkas — detail lengkap ada di plan file)

- **Tidak ada tabel `budget_versions` terpisah** — `event_budgets` adalah baris-per-versi itu
  sendiri (pola sama seperti `documents.version`), revisi = insert baris baru + flag lama
  `SUPERSEDED`.
- **Tidak ada tabel `expense_approvals` terpisah** — `expense_status_history` mencatat tiap
  perubahan (pola sama `event_status_history`), keputusan "saat ini" cukup di kolom `expenses`.
- **Satu tabel `approval_thresholds` untuk BUDGET dan EXPENSE**, dibedakan kolom `context` — sudah
  diimplementasikan di Stage A.
- **Revenue Recognized dibekukan sekali saat status `COMPLETED`** (`events.revenue_recognized_amount`),
  biaya (`compute_event_costs()`) tetap dihitung live karena expense approval berlanjut sampai
  `FINANCIAL_CLOSING`. Belum diimplementasikan (Stage D).
- **Financial closing lewat fungsi wrapper `apply_financial_closing()`** yang memanggil
  `transition_event_status(id, 'CLOSED')` di akhir — persis pola `assign_pic()`, bukan menambah
  cabang closing ke fungsi generik. Belum diimplementasikan (Stage E).
- **Semua kalkulasi finansial adalah SQL function, bukan `create view`** — konsisten dengan seluruh
  migration yang sudah ada.
- **MFA untuk FINANCE/ADMIN adalah Stage H (terakhir), tidak memblokir stage lain** — orthogonal
  dari model data finansial.

## 4. Pekerjaan yang Belum Selesai (Phase 2)

- [x] ~~Integrasi email nyata via Resend~~ — selesai, lihat §1.
- [x] ~~UI Template Checklist & Template Task~~ — selesai, lihat §1.
- [x] ~~Server Action bulk-create task dari template (FR-TSK-04)~~ — selesai, lihat §1.
- [x] ~~Tab Checklist & Issues di Event Detail~~ — selesai, lihat §1.
- [x] ~~Perluasan gate `markReady()`~~ (checklist wajib + issue CRITICAL) — selesai, lihat §1.
- [x] ~~Tab Resources (Trainer/Venue/Equipment assignment) di Event Detail~~ — selesai, lihat §1.
- [x] ~~Tab Documents di Event Detail~~ — selesai, lihat §1.
- [x] ~~UI Participant Management~~ (list/tambah peserta, import CSV dengan preview, tracking
  kehadiran, export dengan audit log) — selesai, lihat §1.
- [x] ~~UI Event Change Request~~ — selesai, lihat §1. **Semua tab Event Detail Phase 2 kini
  lengkap** (Tasks, Checklist, Issues, Resources, Documents, Participants, Perubahan).
  **Seluruh daftar pekerjaan Phase 2 dari awal sesi ini sudah selesai.**

## 4b. Pekerjaan yang Belum Selesai (Phase 3 — mengikuti plan file, Stage A–H)

- [x] **Stage A** — cost_categories, vendors, approval_thresholds + RLS + seed — selesai, sudah
  di-commit (lihat §1 Phase 3 untuk detail verifikasi).
- [x] **Stage B** — `event_budgets` (versioned) + `event_budget_items` + `decide_budget()` + RLS —
  selesai, sudah di-commit, termasuk fix bug row-NULL nyata (lihat §1 Phase 3).
- [x] **Stage C** — `expenses`, `expense_status_history`, `submit_expense`, `decide_expense`,
  `mark_expense_under_review`, `mark_expense_paid`, guard triggers (receipt wajib di atas ambang,
  tolak expense baru di event CLOSED, deaktivasi cost category yang masih dipakai) — selesai, sudah
  di-commit, termasuk eskalasi BR-FIN-14 dan variance alert §14.5 (lihat §1 Phase 3).
- [x] **Stage D** — `events.is_promotional/revenue_recognized_amount`, 4 kolom billing di
  `participants`, `compute_event_revenue/costs/budget_variance`, extend `transition_event_status()`
  untuk freeze revenue di `COMPLETED` — selesai, sudah di-commit, termasuk fix bug ambiguous-column
  dan fix gap RLS `events_select` untuk FINANCE (lihat §1 Phase 3).
- [x] **Stage E** — `financial_closings`, `apply_financial_closing()`, reopen-stamp — selesai,
  sudah di-commit, 22/22 skenario lolos tanpa bug baru (lihat §1 Phase 3).
- [x] **Stage F** — Zod schemas + Server Actions untuk semua entitas finansial (belum ada UI) —
  selesai, sudah di-commit, termasuk pola mapping error RPC→pesan ramah yang baru diperkenalkan
  (lihat §1 Phase 3).
- [x] **Stage G** — UI: master data Financial (cost category/vendor/approval threshold), tab
  Financial di Event Detail (budget builder, expense inbox, ringkasan Actual/Pending/Projected +
  variance), tombol Financial Closing/Reopen — selesai, sudah di-commit, diverifikasi penuh lewat
  browser sungguhan (lihat §1 Phase 3). Margin belum tampil di tab Financial secara live (hanya
  muncul di snapshot `financial_closings` setelah ditutup) — cukup sesuai desain karena margin
  memang baru final setelah closing, bukan gap.
- [x] **Stage H** — MFA untuk FINANCE/ADMIN — kode selesai & terverifikasi level API
  (2026-09-14): `mfa-actions.ts` (enroll TOTP/verify/unenroll/admin-reset) + `mfa-manager.tsx`
  (5 state UI) + `requireAAL2()` di `lib/auth/session.ts` + gate di 10 aksi mutasi finansial
  (`decideEventBudget/decideExpense/markExpensePaid`, CRUD cost-category & approval-threshold,
  `applyFinancialClosing`) + halaman `/account/security` (sengaja tanpa gate, anti-redirect-loop)
  + tombol reset MFA di admin. Cakupan gate = *financial judgment* (approve/paid/master/closing),
  BUKAN create/submit/read/vendor — disengaja & terdokumentasi di kode (bukan celah).
  Diverifikasi live ke Supabase Cloud (user FINANCE uji, lalu dibersihkan tuntas): enroll →
  challenge+verify kode TOTP → sesi naik aal1→aal2 → admin listFactors/deleteFactor → 0 sisa.
  Catatan hapus: hapus profile/roles DULU baru auth user (FK menahan `deleteUser`).
  Sisa: walkthrough browser untuk UX QR/redirect (skrip manual ada di A2).

## 5. Bug/Error yang Masih Ada / Perlu Perhatian

- **Password admin test tiba-tiba tidak berfungsi (2x terjadi)** — root cause belum ditemukan,
  di-workaround dengan reset ulang lewat `scripts/dev-set-admin-password.mjs`
  (password dev saat ini: `EmocsDevTest123!`, email `fajar.hseskillup@gmail.com`). Kalau
  terulang lagi, jalankan ulang script ini — tapi kalau sering terjadi, layak diselidiki
  root cause-nya (mungkin ada proses lain yang mereset auth, atau token JWT expiry issue).
- **Tidak ada bug terbuka pada kode yang sudah dikerjakan** — semua fitur Phase 1 dan
  Trainer/Venue/Equipment Phase 2 sudah diverifikasi end-to-end di browser tanpa isu yang
  belum di-fix.
- **[SELESAI 2026-09-15] Login Google 400 "provider is not enabled"** — bukan bug kode
  (provider `google` di action sudah benar); ternyata provider Google memang belum pernah
  dikonfigurasi di project Supabase (`external_google_enabled: false`, client ID kosong).
  User mengisi OAuth client + redirect URI + enable di dashboard — terverifikasi via Management
  API: enabled true + client ID present. Uji klik tombol sesungguhnya tetap perlu browser user.
  Catatan sisa: `site_url` masih localhost (ganti saat deploy, ikut C1); `disable_signup: false`
  masih terbuka padahal desain invite-only — putuskan sebelum go-live.
- **[SELESAI 2026-09-15] Soft-delete lewat RLS SELALU gagal 403 — root cause sistemik**:
  `UPDATE ... SET deleted_at = ...` via RLS ditolak dengan "new row violates row-level security
  policy" **bahkan untuk ADMIN**, karena PostgreSQL ikut menegakkan USING dari policy SELECT
  (`deleted_at is null`) terhadap baris BARU hasil UPDATE (berlaku sebagai WITH CHECK). Terbukti
  lewat 3 reproduksi independen (PostgREST + Management API + SQL langsung) + `EXPLAIN` yang
  menampilkan filter `deleted_at IS NULL` di plan UPDATE hasil penggabungan policy SELECT.
  **Fix untuk `customers`**: RPC `deactivate_customer(uuid)` (SECURITY DEFINER, cek role di dalam,
  `search_path = public`) — migration `0031_customer_deactivate_rpc.sql`; guard
  `guard_master_data_in_use()` + audit tetap jalan DI DALAM fungsi dengan visibilitas penuh.
  Server Action `deactivateCustomer()` kini memanggil RPC. Diverifikasi 7/7 lewat PostgREST
  sebagai ADMIN asli (update RLS ok, insert contact ok, deactivate unused ok+deleted_at set,
  in-use diblokir CUSTOMER_IN_USE + row selamat, unknown id → CUSTOMER_NOT_FOUND, cleanup 0 sisa);
  `tsc`/`lint`/`build` hijau. **Rollout bertahap ke tabel lain perlu audit** (semua tabel
  ber-`deleted_at` yang di-soft-delete lewat UPDATE RLS berisiko bug yang sama).
- **[SELESAI 2026-09-19] Rollout fix soft-delete ke 5 master data tersisa** — migration
  `0036_master_data_deactivate_rpcs.sql` menambahkan `deactivate_training/city/trainer/venue/
  equipment` (pola sama dengan `deactivate_customer`: SECURITY DEFINER, cek peran via
  `public.has_any_role`, `search_path = public`, guard in-use DI DALAM fungsi dengan visibilitas
  penuh, raise `*_NOT_FOUND` bila id tak ada, grant hanya ke `authenticated`). Guard yang
  ditambahkan: trainings→`events.training_id`, cities→`events.city_id`, trainers→
  `trainer_assignments.trainer_id`, venues→`venue_bookings.venue_id`, equipment→
  `equipment_assignments.equipment_id` (tabel Phase 2 tidak punya trigger guard di DB; guard
  hidup di dalam fungsi). Server Action `deactivateTraining/City/Trainer/Venue/Equipment` di
  `actions/master-data-actions.ts` kini memanggil RPC + memetakan error `*_IN_USE`/`*_NOT_FOUND`
  ke pesan Bahasa Indonesia. **Catatan deploy:** `supabase db push` juga menerapkan migrasi
  yang tertinggal 0034 (`event_submitted_notify_admin_management`) dan 0035
  (`notify_pic_operational_stages`) yang belum pernah ter-aplikasi ke Cloud — terverifikasi
  ter-aplikasi (database Cloud sebelumnya berhenti di 0033). UI: kelima halaman master
  (`/master/{trainings,cities,trainers,venues,equipment}`) kini punya kolom Aksi role-gated +
  dialog Ubah (create/update switch) + tombol Hapus dengan konfirmasi, mengikuti pola
  `customer-row-actions.tsx`. **Verifikasi browser E2E 13/13 PASS** (Playwright + Chromium headless,
  login admin asli): halaman Tahap 4 `/inbox`, `/tasks`, `/financials`, `/audit-log` render; kelima
  halaman master render dengan header Aksi + tombol create (trainers/venues/equipment legitimately
  empty di DB produksi → empty-state); roundtrip penuh City create → edit provinsi → delete lewat
  RPC `deactivate_city` sukses (row hilang dari daftar, tanpa sisa data uji).
- **[SELESAI 2026-09-19] Akses role Sales ke Customer** (temuan user: Sales tidak punya menu
  untuk menambah Customer; padahal `createCustomer` + halaman `/master/customers` sudah
  mengizinkan SALES, hanya sidebar desktop tak menampilkannya): nav **Customer** baru di
  `components/shared/app-sidebar.tsx` untuk role SALES/SALES_MANAGER (create-only, tanpa kolom
  Aksi); wizard Event Request mendapat tombol **"+ Tambah Customer"** inline di langkah Customer —
  `CustomerDialog` diberi prop opsional `onCreated` (di-`createCustomer` sukses), customer baru
  masuk dropdown + `customer_id` ter-set otomatis + kontak PIC auto-termuat. Tidak ada backend/DB
  berubah. Verifikasi E2E 17/17 PASS (Playwright; satu kegagalan awal murni race-timing pada
  deteksi redirect `/events/new`, terbukti sukses saat diulang): admin (sidebar Customer tampil,
  wizard inline create → customer terpilih + PIC termuat) dan **SALES murni** (Dwi Atmaja — nav
  hanya Dashboard/Daftar Event/Customer, tanpa Master Data/Task/Inbox/Finance; `/master/customers`
  punya tombol tambah tanpa kolom Aksi); data uji dibersihkan (customer + draft event dihapus).
  Catatan: password user sales Dwi Atmaja di-set ulang untuk keperluan verifikasi
  (`SalesVerify123!`) — pola sama seperti admin.
- **[SELESAI 2026-09-19] Tombol Ubah & Hapus di Daftar Event** (instruksi user: menu Side Bar
  "Daftar Event"); untuk role ADMIN, SALES_MANAGER, OPERATIONS_MANAGER. **Ubah = dialog edit cepat
  di daftar** (`app/(dashboard)/events/event-edit-dialog.tsx`, tipe `EventEditRow`, semua field
  draft kecuali status/sales_team_id, ikut `eventDraftSchema` + role gate
  `updateEventDetails` di `actions/event-actions.ts`, util `eventPatchFromDraft` diekstrak dari
  `updateEventDraft`); **Hapus = soft delete** (`deleted_at`) via RPC `deactivate_event`
  (migration `0037_event_deactivate_rpc.sql`: SECURITY DEFINER, ADMIN/OM = semua status non-CLOSED;
  SALES_MANAGER = hanya event timnya SUBMITTED/REVISION_REQUESTED; hard delete tetap tidak
  mungkin). Kolom **Aksi** baru di `events-list.tsx` (role-gated via `canEditEvents`, per-row
  `rowEditable`: OM/ADMIN status≠CLOSED, SM status SUBMITTED/REVISION_REQUESTED + tim cocok) +
  `event-row-actions.tsx` (Ubah + Hapus dengan konfirmasi `window.confirm`). **Bug saat E2E:**
  `deactivate_event` versi 0037 memakai `select id,status,sales_team_id into strict v_event`
  — assignment `SELECT INTO` ke variabel komposit bersifat POSISIONAL sehingga `status` ('SUBMITTED'
  dst) dicoba di-assign ke kolom kedua tabel `events` (uuid) → PostgREST 400
  `invalid input syntax for type uuid: "SUBMITTED"`. Diperbaiki oleh migration
  `0038_event_deactivate_rpc_fix.sql` (`create or replace` + `SELECT *` agar kolom berpadanan
  1:1). **Verifikasi browser E2E 6/6 PASS** (Playwright headless): admin — kolom Aksi tampil,
  dialog "Ubah Event" terbuka, ubah nama → tersimpan & list ter-refresh, Hapus → event hilang
  dari daftar (terverifikasi `deleted_at` ter-set via PostgREST), SALES murni — kolom Aksi tidak
  tampil. Data uji ter-soft-delete (tidak ada sisa terlihat). Type-check, lint (baseline 18),
  dan `npm run build` hijau.

## 6. Next Steps

**SELESAI 2026-09-15 — Pengembangan Event Request + Sales Team** (instruksi user): Tipe Event
disederhanakan jadi 4 pilihan `(INHOUSE, PUBLIC, PRIVATE, CUSTOM)` via migration
`0032_event_type_4opsi_seed_training.sql` (enum lama ONLINE/HYBRID/ASSESSMENT dimigrasikan ke
INHOUSE, pola create-new-enum + swap — Postgres tidak bisa menghapus anggota enum; seluruh kolom
bersangkutan di `events`/`checklist_templates`/`task_templates` ikut di-swap, catatan: null tetap
null, reproduksi CASE null → INHOUSE yang salah sudah dikoreksi). Master `trainings` di-seed 3
program default per perusahaan (Training / Training + Certification / Certification Only,
`on conflict (company_id, code) do nothing` — 0032). Wizard Event Request kini memakai label
ramah (Public/Inhouse/Private/Custom Training) dan field Nilai Jual auto-format `Rp xxx.xxx`
(pola digits-only + grouping titik, nilai tersimpan tetap number — `event-wizard.tsx`).
Sales team: `events.sales_team_id` yang sudah ada kini ditampilkan di Event List & Event Detail;
Admin mendapat UI kelola Tim Sales (buat tim + tim per user di tabel user + pilih tim saat
mengundang — `invite-user-dialog.tsx`, `user-team-select.tsx`, `teams-section.tsx`,
aksi `createTeam`/`updateUserTeam` di `admin-actions.ts`); `handle_new_user()` sudah
menyebarkan `team_id` invite ke profile. Set tim sales user = cara mengaktifkan visibilitas
SALES_MANAGER atas event timnya di RLS (sudah ada sejak `0008`). Zod `EVENT_TYPES` +
`EVENT_TYPE_LABELS` jadi single source (dipakai wizard + checklist/task template dialog).
**Verifikasi browser E2E 2026-09-15 — 24/24 PASS** (Playwright + Chromium di temp luar repo,
`C:\Users\DELL\AppData\Local\Temp\opencode\pv\verify.mjs`, bukan tambahan dependency repo):
login admin → buat tim Sales + assign ke user admin (persist setelah reload) → wizard lengkap
(customer "PT Lontar Papyrus Pulp and Paper", program TRAINING, tipe "Public Training",
delivery ONLINE) → Nilai Jual ketik 250 → "Rp 250", 5000000 → "Rp 5.000.000", final 1500000
tersimpan → submit → /events: EVT-... muncul, SUBMITTED, kolom Tim Sales = tujuan, Nilai
Rp1.500.000 → detail Overview: Tim Sales + Nilai Jual tampil. Data uji dibersihkan tuntas
(0 event tersisa, 0 tim, profile.team_id null).

**Bug ditemukan saat E2E & diperbaiki: submit event delivery ONLINE selalu gagal** — schema
submit (`eventRequestSchema`) mewajibkan `location_type`, tapi wizard menyembunyikan field lokasi
saat `delivery_mode = ONLINE` sehingga nilai tetap null. Fix di `actions/event-actions.ts`
(`createEventDraft` + `updateEventDraft`): saat `delivery_mode = ONLINE` dan `location_type`
null, simpan `'ONLINE'` (nilai enum `location_type` yang memang ada). Diverifikasi: event ONLINE
baru tersimpan `location_type = 'ONLINE'` dan submit sukses.

Semua 8 item Phase 2 **sudah selesai** (commit `51b0f40` s/d `0b085b8`, lihat §1 untuk detail
masing-masing).

**Instruksi user saat ini: lanjutkan Phase 3 sesuai plan yang sudah disetujui** (plan file
`C:\Users\DELL\.claude\plans\hazy-hugging-cupcake.md`). Stage A–H sudah selesai (lihat §1 Phase 3
untuk detail lengkap, termasuk verifikasi MFA Stage H dan acceptance RPC 2026-09-14).
Langkah berikutnya (sisa menuju final Phase 3):

1. ~~**Stage H**~~ — SELESAI 2026-09-14 (kode + verifikasi API + `npm run build` hijau, lihat §4b).
2. **Acceptance pass Phase 3, level RPC — SELESAI 2026-09-14** (skrip temp, sudah dihapus):
   satu INHOUSE penuh (submit→approve→PIC→task/checklist→READY→RUNNING→COMPLETED→budget→
   3 expense→paid→POST_EVENT→FINANCIAL_CLOSING→CLOSED) dan satu PUBLIC penuh, semua via RPC
   sebagai role-user sungguhan (5 akun uji, dibuat & dibersihkan tuntas).
   budget→expense (campuran approve/reject di berbagai tier)→COMPLETED→financial closing sebagai
   SATU alur berurutan (bukan per-fitur terpisah seperti tiap stage sejauh ini) — **level RPC
   SELESAI 2026-09-14** (60+ cek hijau: snapshot INHOUSE rev 10jt/actual 5,16jt/margin 48,4% GREEN;
   PUBLIC rev 1,5jt/actual 80rb/margin 94,67% GREEN; self-approval & tier-guard & eskalasi BR-FIN-14
   & variance alert & revenue-freeze semua terbukti; cleanup nol sisa). **Sisa: walkthrough UI di
   browser** (butuh sesi browser sungguhan — skrip manual: buat event → wizard → tab Financial
   budget→expense→paid → closing, cocokkan angka layar vs query; PUBLIC butuh input billing dulu,
   lihat butir 4). Billing PUBLIC pada run ini di-seed via SQL (belum ada UI-nya).
3. **Item follow-up yang sengaja ditunda** (lihat §1 Phase 3 Stage G): tab Financial saat ini
   tersembunyi total dari Sales/Sales Manager.
   - **[SELESAI 2026-09-14 — user setuju]** Ringkasan "total saja" untuk Sales: `getSalesCostSummary()`
     (`actions/financial-actions.ts`) + kartu "Total Biaya Aktual" di tab Overview (`events/[id]/page.tsx`).
     Aturan: hanya pemilik event (`sales_user_id` = viewer) DAN hanya bila tidak melihat tab Financial;
     hanya `actual_cost` yang keluar fungsi (pending/projected/revenue di-strip); tidak pernah
     diteruskan ke Client Component. Diverifikasi live (2 user Sales uji, dibersihkan tuntas):
     owner dapat total 250rb = cocok hitungan SQL; non-owner tetap bisa lihat baris event tapi
     compute DITOLAK. `tsc`/`lint`/`build` hijau.
4. **[SELESAI 2026-09-14 — user setuju bangun]** UI billing peserta: `participantBillingSchema`
   (Zod) + `updateParticipantBilling()` + kolom Tagihan & dialog edit di participant panel
   (`unit_price`, `billing_status`, `payment_status`; label Indonesia). Tanpa migrasi —
   RLS `participants_write` yang sudah ada sudah mengizinkan PIC/OM/ADMIN. Diverifikasi
   live (user uji OM/PIC/SALES, dibersihkan tuntas): PIC bisa tulis, SALES ditolak RLS
   (0 rows), revenue PUBLIC ikut berubah benar (CONFIRMED dihitung, WAIVED dikecualikan),
   enum invalid ditolak DB. `tsc`/`lint`/`build` hijau.
5. **[DIKUNCI 2026-09-14 — user konfirmasi final]** Nilai `[ASSUMPTION]`: tier expense
   0–1jt OPS / 1–5jt OPS_MGR / 5–15jt FINANCE / >15jt MGMT; tier budget 0–15jt FINANCE /
   >15jt MGMT; kuitansi wajib >Rp100rb; budget selalu wajib. Semua berupa data (master
   thresholds + `companies.settings`), bisa diubah via UI tanpa migrasi.

Item lain yang belum dikerjakan (non-blocking, tunggu instruksi eksplisit):
- **Acceptance pass Phase 2** — smoke test manual menyeluruh satu alur (belum dilakukan, Phase 2
  diverifikasi per-fitur bukan sebagai satu alur besar).
- Root cause password admin test yang beberapa kali tiba-tiba tidak berfungsi (lihat §5) masih
  belum diselidiki, kalau muncul lagi.

**SELESAI 2026-09-15 — Dashboard ala Studio P26 + shell sidebar global** (instruksi eksplisit
user, override DESIGN.md §4.1 top-nav): `app/(dashboard)/layout.tsx` kini sidebar navy #152033
(`components/shared/app-sidebar.tsx`, active via `usePathname`) + header search GET `/events?q=`
+ bell + pill user (inisial, nama, label role) + mobile nav horizontal <1024px. Menu tanpa rute
(My Events, Calendar, Finance, Reports) tampil nonaktif badge "Segera hadir", tanpa link mati.
`/dashboard` dirombak: hero sapaan + kartu gradien, 4 KPI role-aware (Total, Aktif, Selesai,
Revenue=sum `sales_value` non-DRAFT non-CANCELLED; scope all/own-sales/own-PIC; DRAFT di-exclude
ikut pola lama), donat status 16→5 kelompok (`components/dashboard/status-groups.ts`) +
irisan Dibatalkan kondisional, bar ganda 6 bulan (recharts — dependency baru yang disetujui
user), Quick Actions, tabel Event Terbaru (badge `EVENT_STATUS_LABELS`), stepper Workflow,
kalender bulanan `?cal=` dengan dot warna grup. `dashboard/loading.tsx` skeleton.
**Verifikasi browser 2026-09-15 — 22/22 PASS, 0 console error**
(`C:\Users\DELL\AppData\Local\Temp\opencode\pv\verify-dashboard.mjs`): shell, hero, KPI, panel,
donat+bar render, mobile 360px (sidebar hidden, KPI tampil). Batasan: DB dev hanya berisi event
DRAFT → panel terisi penuh (tabel/bar berisi) belum terlihat live; struktur render berisi
terbukti di run awal (donat 8 event). `tsc`/`lint` (0 error)/`build` hijau.
Pekerjaan master-data CRUD + P0 UI (skeleton global, label global, wizard review) TERTUNDA
menunggu instruksi — file sudah ditambah: `lib/validations/labels.ts`,
update/deactivate actions di `actions/master-data-actions.ts` (training/city/trainer/venue/
equipment) — belum tersambung ke UI.

## 7. Hal Penting yang Harus Dipertahankan

- **Base UI `Select` di Browser pane yang tidak ter-composite visual (background) tidak bisa
  diklik lewat koordinat piksel** — `computer` tool klik ke opsi dropdown gagal dengan "outside
  viewport" meski elemen ada dan benar di accessibility tree; keyboard navigation (`ArrowDown`+
  `Enter`) juga tidak konsisten. **Workaround yang konsisten berhasil** (dipakai di seluruh
  verifikasi Stage G): `javascript_tool` → cari elemen via
  `document.querySelectorAll('[role="option"]')`/`'[role="combobox"]'` → panggil `.click()`
  langsung di elemen DOM-nya. Pola `computer`/`form_input` tetap dipakai untuk textbox biasa (itu
  tidak bermasalah) — hanya Select/combobox Base UI yang butuh workaround ini.
- **Pola mapping error RPC di Server Action Phase 3**: setiap file `actions/{budget,expense,
  financial}-actions.ts` punya fungsi privat `mapXxxError(error)` — sebuah `switch` yang mencocokkan
  `error.message` (bukan `error.code`) terhadap string RAISE EXCEPTION dari migration terkait, lalu
  jatuh ke `error.message` mentah untuk apa pun yang belum dipetakan. **Pertahankan pola ini untuk
  Stage G** ketika UI baru butuh pesan error dari fungsi/RPC yang BELUM dipetakan hari ini — jangan
  buat mekanisme mapping baru yang berbeda gaya, cukup tambah `case` baru ke fungsi yang sudah ada
  (atau buat fungsi serupa untuk file action baru). File `"use server"` **tidak boleh** mengekspor
  helper sync seperti ini — harus tetap jadi fungsi privat tak diekspor di file yang sama.
- **JANGAN pakai `if <composite/row variable> is not null` (atau `is null`) di PL/pgSQL untuk
  mengecek "apakah row ini ditemukan"** — kalau row punya kolom yang memang boleh NULL (mis.
  `created_by`/`updated_by` di `approval_thresholds`), semantik SQL standar untuk ROW berkata
  `IS NOT NULL` hanya TRUE jika **SEMUA** field non-null, dan `IS NULL` hanya TRUE jika **SEMUA**
  field null — kalau campuran, KEDUANYA bernilai FALSE tanpa error apapun. Ini nyata terjadi di
  `submit_event_budget()` (Stage B Phase 3): notifikasi ke approver senyap tidak pernah terkirim
  karena guard `if v_tier is not null` selalu FALSE meski tier berhasil di-resolve. **Selalu cek
  field spesifik yang dijamin non-null saat row ditemukan** (mis. `v_tier.id is not null`), bukan
  seluruh composite. Berlaku untuk semua fungsi baru di Phase 3 yang memakai
  `resolve_approval_tier()` atau pola serupa (Stage C expense approval sangat rawan mengulang bug
  ini).
- **JANGAN pakai nama kolom bare (tanpa qualifier tabel) di dalam fungsi PL/pgSQL yang punya OUT
  parameter/kolom hasil (`returns table(...)`) bernama sama** — Postgres tidak bisa membedakan
  referensi ke kolom tabel dari referensi ke variabel OUT parameter, dan gagal dengan error
  eksplisit "column reference ... is ambiguous". Nyata terjadi di `compute_budget_variance()`
  (Stage D Phase 3): subquery internal menulis `cost_category_id` bare padahal fungsi itu sendiri
  punya OUT parameter `cost_category_id`. **Selalu qualify setiap kolom dengan alias tabel** di
  dalam fungsi semacam ini, bahkan untuk subquery yang terasa "aman" karena scope-nya kelihatan
  lokal. Beda dengan bug row-NULL di atas, bug ini setidaknya SELALU error keras (tidak senyap),
  tapi tetap harus diwaspadai sejak awal penulisan, bukan ditemukan lewat trial-and-error.
- **`window.open()` untuk link yang butuh data async (signed URL, dll) harus dipanggil SEBELUM
  `await`** — buka tab kosong dulu secara sinkron di dalam handler klik, baru set
  `tab.location.href` setelah data-nya didapat. Memanggil `window.open()` setelah `await`
  kehilangan konteks "user gesture" dan bisa diblokir popup blocker browser secara diam-diam
  tanpa error yang terlihat. Pola ini sudah diterapkan di `document-panel.tsx` (tombol Unduh).
- **JANGAN membangun integrasi WhatsApp di Phase 2 ini** — sudah eksplisit ditunda oleh user
  ("kedepan baru menggunakan WA"). Notifikasi = email only untuk sekarang.
- **Soft-delete pada tabel ber-RLS WAJIB lewat RPC SECURITY DEFINER, bukan `UPDATE ... SET
  deleted_at` langsung** — UPDATE via RLS selalu 403 ("new row violates ... policy") karena
  PostgreSQL menegakkan USING dari policy SELECT (`deleted_at is null`) ke baris baru sebagai
  WITH CHECK (temuan & fix: §5 `0031_customer_deactivate_rpc.sql`). Pola fungsi: cek peran di
  dalam (`public.has_any_role`), `set search_path = public`, trigger guard in-use + audit tetap
  jalan di dalam dengan visibilitas penuh. Semua tabel baru yang butuh soft-delete HARUS mengikuti
  pola ini sejak awal.
- **Verifikasi browser E2E bisa dilakukan tanpa menambah dependency repo: `playwright` + Chromium
  terinstal di `C:\Users\DELL\AppData\Local\Temp\opencode\pv\`** (di luar repo), file driver
  `verify.mjs` ada di sana (login admin → kelola tim sales → wizard event → cek list/detail,
  skenario 2026-09-15, 24/24 PASS). Base UI Select diklik via `el.click()` di `page.evaluate`
  (bukan klik koordinat) — pola yang sama dengan catatan lama. Login email/password pakai
  `form:has(#password) button` karena ada 2 tombol "Masuk" (Google + email). Kredensial admin:
  lihat §5 (reset dulu lewat `scripts/dev-set-admin-password.mjs` bila gagal).
- **Saat regenerate `types/database.types.ts`, JANGAN pakai PowerShell redirection
  (`supabase gen types ... > file`)** — PowerShell 5.1 menulis UTF-16 (BOM), membuat ESLint gagal
  dengan "Parsing error: File appears to be binary". Tulis lewat node (`fs.writeFileSync`) atau
  re-encode dulu ke UTF-8.
- **JANGAN retype ulang definisi fungsi Postgres dari ingatan** saat perlu menambah baris ke
  fungsi yang sudah ada (mis. `assign_pic`, `transition_event_status`) — selalu extract definisi
  persis dari migration terakhir yang benar dulu (`sed -n '/create or replace function X/,/grant execute.../p'`),
  baru edit. Pernah terjadi regresi nyata karena melanggar ini (transisi event rusak total tanpa
  disadari sampai testing).
- **JANGAN pakai `Read` langsung di file yang berisi secret** (`.env.local`, dll) — pakai
  `grep`/`node -e` yang me-redact/mask value saat ditampilkan. Sudah terjadi 3x kebocoran
  (service role key 2x, `RESEND_API_KEY` 1x) via Read langsung atau notifikasi sistem otomatis.
   User sudah diberi tahu semua kejadian ini.    **[SELESAI 2026-09-15 untuk service_role]**
   key lama dirotasi ke secret key baru (`sb_secret_...`, nama `backend_admin`) — terverifikasi:
   format baru, Auth Admin API jalan, akses DB RLS-bypass jalan.
   **[SELESAI 2026-09-15]** user me-roll JWT Secret (tidak ada menu revoke per-key):
   key-key lama mati (terbukti: anon lama 401), `SUPABASE_SERVICE_ROLE_KEY` tetap `sb_secret_...`
   (tidak terpengaruh roll), `NEXT_PUBLIC_SUPABASE_ANON_KEY` diganti ke publishable key baru
   (`sb_publishable_...`) — terverifikasi: sign-in jalan + RLS read jalan + Auth Admin API jalan.
   **Sisa: rotasi `RESEND_API_KEY` (belum dilakukan user).**
- **Selalu verifikasi UI baru langsung di browser preview** (bukan cuma type-check/build) —
  metodologi: gunakan `form_input` untuk mengisi form dan `javascript_tool` dengan `.click()`
  untuk klik, karena `computer` tool sering silent no-op di input React-controlled saat pane
  tidak ter-composite secara visual.
- **Base UI, bukan Radix** — semua komponen baru harus konsisten pakai `render={<Element/>}` dan
  prop `items` di `Select` untuk resolusi label.
- **Setelah setiap create Server Action baru di dialog form, pastikan ada `router.refresh()`**
  setelah `setOpen(false)` — polanya sudah baku, jangan lupakan di dialog-dialog baru
  (checklist template, task template, dst).
- Env vars yang relevan sudah terisi di `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`,
  `SUPABASE_ACCESS_TOKEN`, `ALLOWED_EMAIL_DOMAINS`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.
- **Data uji langsung di Supabase Cloud (bukan lokal) harus selalu dibersihkan setelah verifikasi**
  — proyek ini tidak punya instance dev/staging terpisah, jadi baris apa pun yang dibuat untuk
  menguji RLS/RPC (event, threshold, dsb.) wajib dihapus lagi begitu verifikasi selesai. Barusan
  dilakukan untuk 1 baris `approval_thresholds` uji (Stage A).
- **Asumsi Phase 3 yang ditandai eksplisit di PRD sebagai `[ASSUMPTION]`/`[OPEN QUESTION]`
  (tier approval expense §14.7, ambang wajib-kuitansi §14.2, ambang wajib-budget §14.1) sudah
  di-seed dengan nilai default yang masuk akal, TAPI belum dikonfirmasi user** — flag ke user saat
  Stage G (UI) selesai, supaya bisa dikoreksi lewat UI (bukan migration) kalau salah.
- **Ikuti pola yang sudah baku untuk setiap stage baru**: migration → `supabase db push` →
  verifikasi langsung di Supabase Cloud (query + RLS nyata, bukan cuma baca kode) → regenerate
  `types/database.types.ts` → `npm run type-check` → commit terpisah per stage. Jangan gabung
  beberapa stage jadi satu commit besar.
