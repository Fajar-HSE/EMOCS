# Design — EMOCS (Event Management & Operational Control System)

> Dokumen **sumber kebenaran untuk UI/UX**: visual system, layout, komponen, interaksi, copywriting, dan aksesibilitas. Diturunkan dari PRD EMOCS v1.1 (kebutuhan UX di §24, dashboard §16, acceptance criteria §26) dan System_Design.md (§5 modul, §10 permission).
>
> **Konflik sumber:** kebutuhan bisnis → PRD; implementasi teknis → `System_Design.md`; **visual/UX → dokumen ini**; workflow AI agent → `AGENTS.md`.

---

## 1. Tujuan & Ruang Lingkup

### 1.1 Ukuran Keberhasilan Desain

Desain EMOCS dinilai dari satu pertanyaan (PRD §35):

> **Ketika Sales ingin tahu status event, apakah UX ini membuat mereka membuka EMOCS — bukan WhatsApp?**

Konsekuensi: Event List dan Event Detail adalah dua layar terpenting; setiap keputusan visual yang memperlambat/membingungkan keduanya adalah bug desain.

### 1.2 Lingkup

- **Didesain penuh:** seluruh layar yang sudah ada di `app/` (login, dashboard, event list/wizard/detail + semua panel, task, master data, admin, akun/keamanan) — sesuai status implementasi migrasi 0001–0029.
- **Belum didesain detail:** layar Phase 4 (BI/analitik) — menunggu aktivasi phase.
- **Di luar lingkup:** mobile app native, portal peserta publik (PRD §5 Non-Objectives).

### 1.3 Peta Peran Dokumen

| Dokumen | Pertanyaan yang Dijawab |
|---|---|
| `PRD EMOCS — Product Requirements Document.md` | Apa & mengapa |
| `System_Design.md` | Bagaimana dibangun (arsitektur, data, security) |
| **`DESIGN.md` (ini)** | Bagaimana terlihat & terasa (UI, UX, interaksi) |
| `AGENTS.md` | Bagaimana AI agent bekerja di repo |

---

## 2. Prinsip Desain

Diturunkan dari PRD §3 (Product Principles) & §24 (UX Requirements). Jika konflik antar-keputusan UI, urutan prioritas:

1. **Cepat lebih penting daripada dekorasi.** Tanpa animasi dekoratif, tanpa hero image, tanpa onboarding panjang. RSC-first: kirim JS seminimal mungkin.
2. **Satu layar, satu tujuan.** Setiap route menjawab satu pertanyaan pengguna (mis. `/events` = "event apa dan bagaimana statusnya?"). Tidak ada layar "serba bisa".
3. **Status dapat dipahami dalam beberapa detik.** Setiap event, task, dan dokumen menampilkan status visual yang bisa dikenali tanpa membaca teks panjang.
4. **User selalu tahu langkah berikutnya.** Setiap layar punya satu primary action yang jelas; empty state selalu mengajarkan apa yang harus dilakukan.
5. **Aksi sesuai role dan kondisi.** Tombol yang tidak tersedia untuk role/status **tidak ditampilkan** (bukan sekadar disabled) — penegakan tetap di server (System_Design §10.5), UI hanya untuk UX.
6. **Mobile adalah first-class untuk Operations.** Semua alur kerja Operations (lihat event, selesaikan task, update status, lihat PIC, buat issue — PRD §24) wajib selesai dari 360px.
7. **Feedback yang jelas.** Setiap aksi mendapat respons: loading (skeleton/disabled), sukses (toast + perubahan data), gagal (pesan actionable dalam Bahasa Indonesia).
8. **Form tidak boleh kehilangan data.** Validasi gagal → nilai form dipertahankan; draft autosave; koneksi putus → input tetap ada (PRD §24.8, §27).
9. **Bahasa Indonesia untuk manusia.** Semua label, pesan error, empty state dalam Bahasa Indonesia yang bisa dibaca user — bukan pesan teknis library.
10. **Mengikuti kebiasaan platform.** shadcn/ui + konvensi Tailwind; tidak ada komponen custom bila pola bawaan cukup.

---

## 3. Visual System

### 3.1 Fondasi (implementasi aktual `app/globals.css`)

| Token | Nilai | Keterangan |
|---|---|---|
| Warna dasar | Neutral oklch (palet bawaan shadcn/ui) | `--background` putih, `--foreground` near-black, skala abu untuk muted/border |
| `--primary` | `oklch(0.452 0.198 277.1)` (indigo) | Aksi utama — mengikuti prototipe emocs-icc.ai.studio (spesifikasi rebuild, §4) |
| `--destructive` | Oklch merah | Aksi merusak / status RUSH / CRITICAL |
| `--radius` | `0.9rem` (14px) | Lebih besar dari default shadcn; dominan `rounded-xl`/`rounded-2xl` |
| Font | **Plus Jakarta Sans** (400–800) via `next/font/google` (`--font-jakarta`) + **JetBrains Mono** (`--font-jetbrains`) untuk kode | Load di root layout, direferensikan `--font-sans`/`--font-mono` |
| Sidebar | `bg-slate-900 text-slate-300`, active `bg-indigo-600` | Token `--sidebar*` slate gelap di globals.css |
| Dark mode | Terdefinisi di CSS (`.dark`) tapi **belum diaktifkan** | PRD §22: dark mode = COULD HAVE, bukan MVP |

**Aturan:** jangan menambah warna/spacing baru di luar token Tailwind & variabel shadcn. Kebutuhan warna semantik baru → lewat pemetaan Badge (§5.1), bukan hardcode hex.

### 3.2 Komponen (shadcn/ui — jangan reinvent)

`components/ui/` sudah menyediakan: Button, Badge, Card, Dialog, Sheet, Table, Tabs, Select, Input, Textarea, Checkbox, Switch, Dropdown, Popover, Tooltip, Command (search), Calendar, Skeleton, Toast (Sonner), Progress, Alert, Avatar.

- Semua komponen baru dibangun **di atas** komponen ini (`components/events/`, `components/tasks/`, `components/shared/`).
- Tidak ada library UI kedua. Tidak ada styled-div yang meniru komponen yang sudah ada.
- Ikon: `lucide-react` saja, ukuran 16/20px, stroke 2.

### 3.3 Tipografi & Spacing

- Skala teks Tailwind default: judul halaman `text-2xl font-semibold`, sub `text-lg`, body `text-sm`, label/meta `text-sm text-muted-foreground`, angka penting (Event ID, progress) `font-medium tabular-nums`.
- Spacing kelipatan 4; padding halaman `px-4` (mobile) → `sm:px-6` (≥640px); jarak antar section `space-y-6`.
- Lebar konten maksimum `max-w-6xl mx-auto` untuk list/table; form dialog `max-w-lg`.

---

## 4. Layout & Navigasi

### 4.1 App Shell (implementasi `app/(dashboard)/layout.tsx`)

```text
┌──────────┬───────────────────────────────────────────┐
│          │  Cari...                    🔔 [Nama] Keluar │  header (border-b, sticky)
│ SIDEBAR  ├───────────────────────────────────────────┤
│ navy     │                                           │
│ #152033  │              Konten halaman               │  flex-1, bg #f4f6fa
│ w-64     │                                           │
└──────────┴───────────────────────────────────────────┘
```

- **Sidebar navy global** (override 2026-09-15 atas instruksi eksplisit user, desain
  Studio P26 — menggantikan top-nav §4.1 lama): brand P26 + nav Dashboard,
  Event Management (submenu Semua Event / Buat Event Request), Customers
  (`/master/customers`), Programs (`/master/trainings`), Master Data, Settings,
  Admin (ADMIN saja). Komponen: `components/shared/app-sidebar.tsx` (client,
  active-state via `usePathname`).
- Menu yang **belum ada rutenya** (My Events filter, Calendar, Finance, Reports)
  tampil nonaktif dengan badge "Segera hadir" — tanpa link mati.
- Tambahan 2026-09-19: nav **Customer** (`/master/customers`) ditampilkan untuk role
  **SALES/SALES_MANAGER** (create-only — kolom Aksi tak tampil karena `canManage`
  khusus OM/ADMIN); manajer tetap lewat Master Data. Di wizard Event Request,
  Sales bisa membuat customer inline lewat tombol "+ Tambah Customer" (langkah
  Customer) — customer langsung masuk dropdown + kontak PIC auto-termuat.
- Header: form pencarian GET `/events?q=`, bell notifikasi (Realtime), pill user
  (inisial + nama + label role) → link `/account/security`, tombol Keluar.
- **Mobile < 1024px:** sidebar disembunyikan (`hidden lg:flex`), digantikan baris
  nav horizontal scrollable di bawah header.
- Navigasi role: Admin hanya untuk ADMIN; item lain mengikuti RLS + gate halaman
  masing-masing (sidebar tidak memblokir, hanya menavigasi).

### 4.2 Peta Layar

| Route | Tujuan Layar | Pola Utama |
|---|---|---|
| `/(auth)/login` | Masuk | Kartu tengah, OAuth Google + email/password |
| `/dashboard` | "Apa yang butuh perhatian saya?" | Kartu ringkas per role (§6) |
| `/events` | "Event mana & bagaimana statusnya?" | Tabel + filter + pencarian |
| `/events/new` | "Buat request ≤ 3 menit" | Wizard bertahap (§7) |
| `/events/[id]` | "Event ini di mana, siapa PIC, apa berikutnya?" | Header status + tab panel (§8) |
| `/master/*` | Kelola data acuan | Tabel + Dialog CRUD per entitas |
| `/admin` | User & role | Tabel + invite dialog |
| `/account/security` | Password & MFA | Form + MFA manager |

---

## 5. Bahasa Visual Status (Pola Terpenting)

### 5.1 Badge Status — Semantik Warna

Status adalah bahasa utama sistem (PRD §13: user harus tahu posisi event dalam hitungan detik). Pemetaan semantik badge (varian shadcn) yang wajib konsisten di seluruh aplikasi:

| Kelompok | Varian Badge | Contoh Status |
|---|---|---|
| Netral / draf / menunggu | `secondary` (abu) | DRAFT, SUBMITTED, NO_PO, doc PENDING |
| Berjalan / sehat | `default` (primary) | UNDER_REVIEW, PREPARATION, RUNNING, APPROVED budget |
| Positif / selesai | `outline` + warna sukses (`bg-emerald-100 text-emerald-800` dst. bila token diperlukan) | APPROVED, DONE, COMPLETED, CONFIRMED, expense PAID |
| Perlu perhatian | `outline` amber | REVISION_REQUESTED, POSTPONED, OVERDUE (task), PO_PENDING |
| Berbahaya / terminal gagal | `destructive` | REJECTED, CANCELLED, issue CRITICAL, **RUSH**, expense REJECTED |
| Read-only / terkunci | `secondary` + ikon kunci | CLOSED |

Catatan implementasi saat ini: sebagian panel masih memakai `secondary` untuk semua status non-destructive; **arah desain** ini adalah standar yang dituju saat menyentuh panel terkait — migrasi visual dilakukan per panel, bukan big-bang. Konstanta pemetaan (`STATUS_VARIANT`, `STATUS_LABEL`) didefinisikan per domain di sisi panel, seperti pola yang sudah ada di `change-request-panel.tsx` / `document-panel.tsx`.

**RUSH selalu `destructive`** dan ditampilkan berdampingan dengan status event (implementasi `events/[id]/page.tsx`) — pengecualian disengaja: event < H+7 harus menonjol di semua context.

### 5.2 Progress

- Progress event = `Progress` bar shadcn + angka persen (`tabular-nums`); tidak pernah input manual (dihitung dari task — System_Design BR-EVT-20).
- Warna bar mengikuti logika traffic-light: < 30% dan deadline dekat = amber; sesuai jadwal = primary.

### 5.3 Label Status

Semua enum ditampilkan dengan label Bahasa Indonesia via map konstanta (`STATUS_LABEL`), bukan teks enum mentah. Contoh: `PIC_ASSIGNED` → "PIC Ditugaskan", `REVISION_REQUESTED` → "Perlu Revisi". Label konsisten antara badge, timeline, dan toast.

---

## 6. Dashboard per Role (PRD §16)

Prinsip: setiap angka penting harus bisa di-drill-down ke event pembentuknya; setiap kartu = pertanyaan, bukan dekorasi.

| Role | Pertanyaan Utama | Kartu (urutan prioritas visual) |
|---|---|---|
| **Sales** | "Bagaimana event saya?" | Event Saya (aktif) → Draft → Menunggu Hasil Review → Perlu Perhatian (revision/bermasalah) → Event Mendatang → Selesai |
| **Operations** | "Apa yang harus saya kerjakan hari ini?" | Event Hari Ini → Task Overdue (merah) → Task Saya Berikutnya → Event Tanpa PIC (ops mgr) → Workload (ops mgr) |
| **Management** | "Bagaimana kondisi bisnis?" | Event per Status → per Periode → per Sales/Training/Customer → Pembatalan → (finansial setelah Phase 3 aktif) |

Aturan kartu: angka besar (`text-2xl font-semibold tabular-nums`) + label kecil + klik = filter ke `/events` dengan query terkait. Kartu tanpa drill-down tidak dipakai.

---

## 7. Event Request — Wizard (`/events/new`)

Target PRD §12.3: **request lengkap dibuat ≤ 3 menit.**

1. **Bertahap, bukan satu dinding form:** 3–4 langkah sesuai pengelompokan PRD §12.2 (Customer → Event → Commercial/Priority). Setiap langkah pendek, bisa di-scroll dalam satu layar mobile.
2. **Draft autosave** — AC-02: draft bisa dibuka kembali tanpa kehilangan data; tombol "Simpan Draft" selalu tersedia; wizard tidak reset saat refresh.
3. **Default value di semua pilihan yang bisa ditebak** (delivery mode dari training, priority NORMAL, po_status NO_PO) — minimisasi input.
4. **Validasi inline per field** (Zod, pesan Bahasa Indonesia) + ringkasan error per langkah sebelum lanjut.
5. **Deteksi duplikat** (PRD §27): bila mirip event aktif milik customer sama, tampilkan konfirmasi "Lanjutkan?" sebelum submit — bukan blokir.
6. **Sukses submit** = layar konfirmasi menampilkan **Event ID** besar + langkah berikutnya ("Menunggu review Operations Manager") — momen psikologis penting: identitas event milik Sales (AC-03/04).

---

## 8. Event Detail — Single Source of Truth (PRD §13)

Halaman paling penting sistem. Struktur:

```text
┌─────────────────────────────────────────────────────┐
│ [EVT-2026-000123] Nama Event          [RUSH] [Status]│  header: identitas + status
│ Customer · Training · 12–14 Okt · Kota · 25 peserta  │  meta ringkas
│ PIC: Nama (backup: Nama) · Sales: Nama · [Progress ████░ 60%] │
├─────────────────────────────────────────────────────┤
│ [Aksi Status]  ← panel aksi sesuai role+status       │
├─────────────────────────────────────────────────────┤
│ Ringkasan Event│Task & Progres│Checklist SOP│Resource & Peserta│Keuangan & Closing│Issues & CR│Dokumen & Bukti│Audit Trail│  Tabs/panel (8, konsolidasi)
└─────────────────────────────────────────────────────┘
```

Aturan:

1. **Panel aksi (`event-actions-panel.tsx`) selalu di atas** — menampilkan hanya tombol transisi yang sah untuk status sekarang + role user (matriks System_Design §8.3). Aksi merusak (Reject/Cancel) selalu `variant="destructive"` + dialog konfirmasi dengan **textarea alasan wajib** (PRD §11.1.7–8).
2. **Tabs ke panel domain** (satu panel tiap subjek; Resources+Peserta dan Issues+CR digabung dalam satu tab — implementasi `events/[id]/*-panel.tsx`). Tab yang tidak relevan untuk role disembunyikan (bukan disabled); bagian peserta di dalam tab Resource & Peserta tetap ditutup untuk non-PIC/Ops Manager/Admin (BR-PAR-02).
3. **Panel keuangan** hanya muncul untuk role berwenang (Permission Matrix System_Design §10.3) — Sales melihat total, bukan rincian per expense.
4. **Timeline/status history** menampilkan aktivitas dalam bahasa manusia ("Budi mengubah status dari Preparation ke Ready — System_Design §13.3), bukan dump JSON.
5. **Pertanyaan jempol (PRD §13):** setelah 3 detik melihat layar, user bisa menjawab *"di mana, siapa PIC, apa selesai, apa berikutnya?"* — keempatnya harus terlihat tanpa scroll di mobile.

---

## 8.1 Halaman Operasional Global (Tahap 4)

Empat halaman lintas-event untuk worklist peran, dibangun setelah Event List/Detail berdiri:

| Route | Isi | Audience (sidebar) |
|---|---|---|
| `/inbox` | Antrian review: event `SUBMITTED`/`UNDER_REVIEW`, aksi Setujui/Tolak/Revisi inline (`reviewEvent`), badge `possible_duplicate`, Nilai Jual hanya untuk Ops Manager/Admin | OPS_MGR, OPERATIONS, ADMIN (badge rose) |
| `/tasks` | Semua task saya (assignee saya ATAU PIC/backup event) lintas event; scope "Semua Task" untuk OPS_MGR/ADMIN; filter Menunggu/Selesai/Terlambat/Terhambat; quick status (Mulai/Selesai/Blokir+dialog alasan); baris menaut ke event | OPERATIONS, OPS_MGR, ADMIN (badge indigo) |
| `/financials` | Expense `SUBMITTED`/`UNDER_REVIEW` per tier (`required_approver_role`), Setujui/Tolak; daftar event `FINANCIAL_CLOSING` dengan snapshot revenue/actual/margin + Tutup Financial (FINANCE/ADMIN) | FINANCE, MANAGEMENT, ADMIN, OPS_MGR (badge amber) |
| `/audit-log` | Jejak `audit_logs` (pagination server-side 25/baris) + filter tabel/aktor/aksi; OPS_MGR hanya melihat `events`+`event_tasks`; detail lama→baru dalam Dialog | ADMIN, MANAGEMENT, OPS_MGR |

Aturan:

1. **Aksi mutasi selalu lewat Server Action** (tidak ada update lewat client) — keputusan di-*enforce* ulang di RPC/RLS; UI hanya menyembunyikan tombol yang sudah pasti tidak berhak.
2. **Keputusan merusak (Tolak/Blokir) wajib dialog + textarea alasan** — pola sama dengan Event Detail §8.
3. **Angka sidebar (count)** dihitung di `(dashboard)/layout.tsx` sesuai RLS peran; badge baru muncul jika > 0.
4. **RLS adalah kebenaran:** menu Peran diselaraskan dengan kebijakan RLS (mis. Audit Log tidak untuk FINANCE karena policy `audit_logs_select`; menu di-copy-edit di `app-sidebar.tsx`).

---

## 9. Pola Interaksi

### 9.1 Tabel & List

- Tabel shadcn: baris dapat diklik → detail; aksi per baris via DropdownMenu (bukan tumpukan tombol).
- Pagination server-side 25–50 baris; **tidak pernah** render ribuan baris (System_Design §9.4).
- Filter & pencarian di area atas tabel (Command/Combobox untuk master); state filter tersimpan di URL agar bisa di-share & di-drill-down dari dashboard.
- Mobile: tabel degenerasi ke kartu list (kolom kritis saja: nama, status, tanggal) — `hidden md:table-cell` untuk kolom sekunder.

### 9.2 Form & Dialog

- CRUD master data & aksi cepat memakai Dialog (`*-dialog.tsx` — pola yang sudah ada); form panjang (event wizard) memakai halaman.
- `react-hook-form` + `zodResolver` — error per field di bawah input, ikon merah, `aria-invalid`; fokus otomatis ke field error pertama.
- Submit button: `disabled` + spinner saat `pending`; tidak ada double submit.
- Destructive (hapus/nonaktifkan/batal): dialog dengan konfirmasi tulis, bukan sekadar klik.

### 9.3 Feedback

| Situasi | Respons |
|---|---|
| Mutasi sukses | Toast Sonner singkat + data ter-refresh (`revalidatePath` / optimistic update) |
| Mutasi gagal validasi | Error per field di tempat (bukan toast saja) — form **mempertahankan nilai** |
| `INVALID_TRANSITION` / `CONFLICT` | Dialog/inline: "Status berubah menjadi X oleh Nama. Muat ulang?" — tidak pernah menimpa diam-diam (System_Design §12) |
| Offline saat submit | Input tetap; banner "Tidak tersambung — data draft tersimpan, coba lagi" |
| Realtime | Bell notifikasi + badge unread; perubahan status event muncul tanpa refresh |

### 9.4 Empty / Loading / Error (wajib semua layar — AGENTS.md §9)

- **Empty:** ilustrasi tipis + satu kalimat kondisi + satu CTA ("Belum ada event. Buat Request Event").
- **Loading:** Skeleton dengan bentuk layout asli (bukan spinner layar penuh).
- **Error:** Alert dengan pesan Bahasa Indonesia + tombol "Coba Lagi" + kontak bila persisten.

---

## 10. Mobile (360px) — Aturan Keras

1. Semua alur Operations (PRD §24): lihat event, selesaikan task, ubah status, lihat PIC, buat issue — **tanpa desktop** (AC-16).
2. Touch target ≥ 44×44px (`h-11`); jarak antar kontrol ≥ 8px.
3. Satu kolom; tab panel di Event Detail berupa scroll horizontal atau dropdown di mobile.
4. Task panel mobile: aksi "Selesaikan" & "Blokir" adalah tombol baris (bukan tersembunyi di menu).
5. Form: input numerik pakai `inputMode`, tanggal pakai `Calendar`/native picker; zoom saat fokus dicegah (`text-base` di input).

---

## 11. Aksesibilitas (PRD §25)

- Kontras teks ≥ 4.5:1 (palet neutral bawaan sudah memenuhi; jangan menurunkan `muted-foreground` di bawah batas).
- Navigasi keyboard penuh: semua interaksi bisa dijangkau Tab; `focus-visible` ring jelas; Dialog/Sheet men-trap fokus & tutup dengan Esc.
- Status tidak disampaikan lewat warna saja — selalu badge **teks** (+ varian warna), sehingga aman untuk butuh warna.
- Label form selalu eksplisit (`<Label htmlFor>`), bukan placeholder sebagai label.
- Pesan error dipahami screen reader (`aria-live` untuk toast & error ringkasan).

---

## 12. Copywriting & Format

- **Bahasa Indonesia** untuk seluruh UI. Istilah Inggris hanya yang memang istilah bisnis (Event, PIC, Task, Checklist, RUSH).
- Pesan error = **spesifik & actionable** ("Tanggal selesai tidak boleh sebelum tanggal mulai"), dilarang: "Terjadi kesalahan", kode teknis, pesan library.
- Tombol = kata kerja + objek ("Simpan Draft", "Minta Revisi", "Tandai Selesai") — bukan "OK/Submit" generik.
- Format: tanggal `d MMM yyyy` WIB (12 Okt 2026); uang `Rp1.500.000` (`Intl.NumberFormat` "id-ID"); progress `60%` dengan `tabular-nums`.
- Event ID selalu monospace dan bisa disalin sekali klik.

---

## 13. Decision & Trade-offs (UI/UX)

| Keputusan | Alternatif Ditolak | Alasan |
|---|---|---|
| Top nav tanpa sidebar | Sidebar collapsible | Navigasi dangkal (≤ 4 item); lebih banyak ruang konten di mobile; sidebar = kompleksitas state yang tidak dibutuhkan |
| Tema neutral bawaan shadcn, tanpa brand color custom | Palet brand perusahaan | "Cepat > dekorasi" (PRD §24.1); status color language diurus via badge semantik, bukan tema |
| Dark mode belum diaktifkan | Toggle dark mode | COULD HAVE (PRD §22); token sudah siap — aktivasi = satu pekerjaan kecil, bukan redesign |
| Wizard bertahap untuk request | Satu form panjang | Target 3 menit + mobile: langkah pendek mengurangi abondonment; autosave draft menutup risiko |
| Tabs-panel di Event Detail | Sub-route per domain | Semua konteks event satu layar; aksi status selalu terlihat; mobile lebih sederhana |
| Tabel-first (list event) | Board/kanban | Kanban = COULD HAVE untuk task; tabel lebih padat informasi untuk event lifecycle linier |
| Toast + revalidate (bukan full optimistic UI) | Optimistic update di semua mutasi | Kecilnya risiko data stale vs kompleksitas rollback; optimistic hanya untuk toggle sederhana (read notif, checklist item) |

Trade-off yang diterima: palet monokrom membuat hierarchy lebih bergantung pada berat tipografi & posisi — mitigasi: disiplin §3.3 & bahasa badge §5.1.

---

*Dokumen ini menegakkan prinsip PRD §24: sistem memberi feedback yang jelas, user tahu langkah berikutnya, dan Operations bekerja dari lapangan. Jika sebuah keputusan UI tidak membuat Sales/Operations lebih cepat menyelesaikan pekerjaannya, keputusan itu salah.*
