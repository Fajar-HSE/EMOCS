# EMOCS — Frontend Rebuild Design Spec

> **Tanggal:** 2026-09-19
> **Status:** Approved for implementation planning
> **Sumber:** `PRD EMOCS v1.1`, `System_Design.md`, `DESIGN.md`, prototipe produksi `https://emocs-icc.ai.studio/` (Vite + React SPA, in-memory)
> **Pemilik keputusan:** User (ICC)

## 1. Konteks & Tujuan

Frontend EMOCS yang ada (~95% selesai: Phase 1–3 + sebagian BI) **tidak sesuai** dengan struktur dan visual yang diinginkan. User memutuskan **rebuild presentation layer dari awal**, mengikuti struktur prototipe `emocs-icc.ai.studio` sebagai sumber kebenaran visual/informasi, sambil mempertahankan backend real dan prinsip DESIGN.md.

**Definisi sukses:** setiap layar baru dibangun mengikuti struktur prototipe, memakai komponen shadcn (bukan hand-rolled), label Bahasa Indonesia, dan membaca/mutasi backend Supabase yang ada — tanpa mengubah contract backend.

**Bukan:** membangun ulang backend, memigrasi data, atau menyalin in-memory store prototipe.

## 2. Sumber Kebenaran & Prioritas

Jika konflik, urutan prioritas:

1. **Business requirement** → PRD
2. **Implementasi teknis** → System_Design.md
3. **Struktur & visual** → prototipe `emocs-icc.ai.studio` (override DESIGN.md lama)
4. **Prinsip UX** → DESIGN.md (di mana prototipe tidak menentukan)

### 2.1 Hal prototipe yang **TIDAK** dibawa

- **Persona switcher** — login disimulasi di prototipe; app real pakai Supabase Auth (Google OAuth + email/password, invite-only). Dihapus.
- **In-memory store** (`AppProvider`/`useApp`, seed `EVT-2026-…`) — diganti backend real.
- **Label status English** ("Submitted", "Under Review") — prototipe memakai label English + deskripsi Indonesia; app real mempertahankan **label Bahasa Indonesia** dari `lib/validations/labels.ts` per DESIGN.md §5.3 ("Perlu Revisi", "PIC Ditugaskan", dst).
- **Komponen hand-rolled** — prototipe tidak pakai shadcn/radix; app real **tetap shadcn/Base UI** per DESIGN.md §3.2 dan aturan repo "Base UI, bukan Radix".

## 3. Batas Scope

### 3.1 TIDAK berubah (backend contract — dilarang sentuh)

- `actions/*.ts` (19 Server Action), `lib/supabase/`, `lib/auth/`, `lib/services/`, `lib/validations/`
- `supabase/migrations/` (0001–0035), `types/database.types.ts`
- `proxy.ts` (middleware Next 16), `app/api/`, `app/auth/callback/route.ts`
- Contract: mutasi hanya lewat Server Action; transisi status hanya lewat `transitionEventStatus` → RPC `transition_event_status`.

### 3.2 Di-rebuild (presentation layer)

- `app/(auth)/*` — login, forgot-password, reset-password
- `app/(dashboard)/*` — layout, dashboard, events (list/new/[id]), master/*, admin, account/security, analytics, + route baru
- `app/globals.css`, `app/layout.tsx` (root, inject font)
- `components/{shared,dashboard,events,tasks}/` — `components/ui/` tidak disentuh

### 3.3 Dipertahankan (sudah conform — salin, jangan tulis ulang)

- `components/ui/*` (38 primitives shadcn/Base UI)
- `lib/validations/labels.ts` (21 label map, dipakai 14 file)
- `components/shared/event-status-badge.tsx` + `components/dashboard/status-groups.ts` — palet badge↔donut terpadu. **Catatan:** ini menggantikan variant table DESIGN.md §5.1; pertahankan sebagai standar tunggal warna status.
- `components/shared/stat-card.tsx`, `notification-bell.tsx`, `customer-search-select.tsx`
- `app/(dashboard)/layout.tsx` + `app-sidebar.tsx` — **disesuaikan** (warna slate-900, 9 menu) tapi struktur shell-nya dipakai ulang

### 3.4 Dibangun baru (shared foundation)

| File | Isi | Aturan DESIGN.md |
|---|---|---|
| `lib/utils/format.ts` | `formatDate` → "12 Okt 2026"; `formatIDR` → "Rp1.500.000" (`Intl.NumberFormat("id-ID")`); `formatProgress` → `tabular-nums` | §12 |
| `components/shared/empty-state.tsx` | ikon tipis + satu kalimat kondisi + satu CTA primer | §9.4 |
| `components/shared/error-state.tsx` + `app/**/error.tsx` | Alert shadcn + "Coba Lagi"; **tidak pernah** tampilkan pesan error DB mentah | §9.4, System_Design §11 |
| `app/**/loading.tsx` | skeleton bentuk layout asli (bukan spinner) | §9.4 |
| `components/shared/data-table.tsx` | wrapper tabel→kartu otomatis di mobile; kolom sekunder `hidden md:table-cell` | §9.1 |
| `components/shared/copyable-code.tsx` | Event ID monospace + klik salin | §12 |
| `components/shared/page-progress.tsx` | Progress bar + angka, traffic-light (<30% & deadline dekat = amber) | §5.2 |

## 4. Visual System (delta dari DESIGN.md §3)

| Token | Sebelum | Sesudah | Catatan |
|---|---|---|---|
| Font sans | default shadcn | **Plus Jakarta Sans** (400–800) via `next/font/google` | load di root layout |
| Font mono | default | **JetBrains Mono** (400–600) | untuk Event ID & angka |
| Sidebar | navy `#152033` | **slate-900** (`bg-slate-900 text-slate-300`) | ikut prototipe |
| Aksen primer | near-black `oklch(0.205 0 0)` | **indigo** (palet Tailwind indigo-600) | override DESIGN.md §3.1 |
| Radius | `0.625rem` | lebih besar dominan `rounded-xl`/`rounded-2xl` | token `--radius` dinaikkan |
| Shadow | default | `shadow-xs`, overlay `bg-slate-900/60` + `backdrop-blur-xs` | |
| Konten | `max-w-6xl` | `max-w-7xl` | ikut prototipe |

**Dipertahankan:** palet neutral Tailwind, tidak ada warna custom hex baru di luar pemetaan badge (aturan §3.1 "jangan menambah warna di luar token"). Semua warna semantik status tetap lewat `status-groups.ts`.

## 5. Information Architecture

### 5.1 Sidebar (9 menu, role-gated)

Menggantikan menu sidebar sekarang. Komponen `app-sidebar.tsx` di-extend; menu tanpa route tampil nonaktif badge "Segera hadir" (pola yang sudah ada).

| Menu | Route | Badge | Role yang lihat | Status implementasi |
|---|---|---|---|---|
| Dashboard | `/dashboard` | — | semua 7 role | rebuild |
| Request Inbox | `/inbox` | rose, count | OPERATIONS_MANAGER, OPERATIONS, ADMIN | **baru** |
| Daftar Event | `/events` | count | semua | rebuild |
| Task & Checklist | `/tasks` | indigo, count | OPERATIONS, OPERATIONS_MANAGER, ADMIN | **baru** (folder `app/(dashboard)/tasks` ada, kosong) |
| Finance & Closing | `/financials` | amber, count | FINANCE, MANAGEMENT, ADMIN, OPERATIONS_MANAGER | **baru** |
| Cost Estimator | `/estimator` | "Baru" | sebagian role | **baru — DEFER ke Phase 4** (tampil nonaktif) |
| Database Historis & BI | `/analytics` | — | SALES_MANAGER, OPERATIONS_MANAGER, FINANCE, MANAGEMENT, ADMIN | rebuild |
| Master Data | `/master/*` | — | OPERATIONS_MANAGER, FINANCE, ADMIN, MANAGEMENT | rebuild + wiring |
| Audit Log & Security | `/audit-log` | — | ADMIN, MANAGEMENT, FINANCE | **baru** |

Header (dipertahankan): global search GET `/events?q=` (placeholder prototipe: "Cari Event Code (EVT-...), nama event, customer..."), bell notifikasi Realtime, pill user (inisial + nama + label role) → `/account/security`, tombol Keluar. Mobile <1024px: sidebar hidden + nav horizontal scrollable (sudah ada).

### 5.2 Event Detail — konsolidasi 10 tab → 8

| Tab (prototipe) | Isi | Gabungan dari |
|---|---|---|
| Ringkasan Event | info inti, PIC, progress, sales cost summary untuk owner | Overview |
| Task & Progres (N%) | task CRUD, bulk template, progress otomatis | Tasks |
| Checklist SOP | checklist items, toggle, ringkasan wajib | Checklist |
| Resource & Peserta | trainer/venue/equipment assignment + participants (billing, attendance, CSV) | Resources + Participants |
| Keuangan & Closing | budget builder, expense inbox, ringkasan Actual/Pending/Projected + variance, closing | Financial |
| Issues & CR | issues + change request | Issues + Perubahan |
| Dokumen & Bukti | upload, verifikasi, signed URL download | Documents |
| Audit Trail | status history + audit log dalam bahasa manusia | Timeline |

Penegakan role tetap per sub-panel (canViewFinancial, canViewParticipants) — hanya UI yang digabung; RLS di backend tidak berubah.

Header Event Detail (DESIGN §8): Event ID copyable mono + RUSH badge destructive + status badge; meta ringkas (Customer · Training · tanggal · kota · peserta); PIC (backup) · Sales · progress bar; panel aksi selalu di atas (transisi sah per status+role).

### 5.3 Event Wizard — 4 langkah (prototipe)

1. **Customer & Kontak** — pilih/create customer + kontak (combobox `customer-search-select`)
2. **Detail Event** — nama, training, event type (4 opsi: INHOUSE/PUBLIC/PRIVATE/CUSTOM), delivery mode, tanggal, waktu, lokasi/kota, peserta
3. **Komersial & PO** — sales value (auto-format Rp), PO status + nomor, prioritas
4. **Review & Submit** — ringkasan + deteksi duplikat + submit

Default value (DESIGN §7.3), draft autosave (AC-02), validasi Zod inline per langkah, layar sukses menampilkan Event ID besar (AC-03/04). Reuse `eventRequestSchema` + `createEventDraft`/`updateEventDraft`/`submitEvent` yang ada.

## 6. Halaman Baru (non-Event Detail)

| Route | Tujuan | Sumber data (read-only, RLS) |
|---|---|---|
| `/inbox` | antrian review untuk Ops Manager: event SUBMITTED/UNDER_REVIEW, approve/reject/revision inline | `events` + `transitionEventStatus` |
| `/tasks` | semua task saya (PIC/assignee) lintas event: filter overdue/blocked, link ke event | `event_tasks` |
| `/financials` | expense pending approval per tier saya + event di FINANCIAL_CLOSING | `expenses` + `financial_closings` |
| `/audit-log` | audit trail global: filter tabel/aktor/aksi | `audit_logs` |

`/estimator` dibuat **nonaktif** dulu (Phase 4 per PRD §20 — data historis belum cukup; estimator harus bisa bilang "data belum cukup").

## 7. Master Data — wiring yang tertunda

Backend actions `updateTraining/deactivateTraining`, `updateCity/deactivateCity`, `updateTrainer`, `updateVenue`, `updateEquipment` sudah ada di `actions/master-data-actions.ts` tapi **belum tersambung UI**. Bangun `*-row-actions.tsx` untuk 5 entitas ini mengikuti pola `customer-row-actions.tsx` (edit dialog + deactivate dengan konfirmasi).

### 7.1 Prasyarat: bug sistemik soft-delete (ditemukan saat self-review spec)

Kelima fungsi `deactivate*` di atas memakai `UPDATE ... SET deleted_at = ...` poloso via klien RLS — **pola yang terdokumentasi selalu gagal 403** di PROJECT_STATUS.md §5 ("new row violates row-level security policy" bahkan untuk ADMIN, karena PostgreSQL menegakkan USING dari policy SELECT terhadap baris baru sebagai WITH CHECK). Fix yang sudah terbukti untuk `customers`: RPC `deactivate_<entity>(uuid)` `SECURITY DEFINER`, cek role di dalam, `set search_path = public`, trigger guard in-use + audit tetap jalan di dalam fungsi (migration `0031_customer_deactivate_rpc.sql`).

**Sebelum men-wire UI deactivate, wajib** (per entitas, ikut pola 0031):

1. Migration baru: `deactivate_training` / `deactivate_city` / `deactivate_trainer` / `deactivate_venue` / `deactivate_equipment` (atau satu fungsi generik parametrik bila lebih sederhana — pertimbangkan, tapi jangan over-engineer).
2. Cek `guard_master_data_in_use()` sudah mencakup tabel terkait (customers/trainings punya guard; trainer/venue/equipment perlu verifikasi).
3. Ubah Server Action memanggil RPC alih-alih UPDATE.
4. Verifikasi di Supabase Cloud: nonaktifkan yang tak terpakai → sukses; yang terpakai event → diblokir `*_IN_USE`; baris tetap utuh.
5. `supabase db push` + regenerate `types/database.types.ts` (lewat node, **bukan** PowerShell redirection — masalah UTF-16 BOM).

**Catatan:** fungsi `update*` (tanpa `deleted_at`) **tidak** terkena bug ini — UPDATE biasa lolos karena baris baru tetap `deleted_at is null`. Hanya deactivate yang terkena.

## 8. Staging

Setiap stage: `npm run lint` + `npx tsc --noEmit` + `npm run build` hijau + verifikasi browser (Playwright di `C:\Users\DELL\AppData\Local\Temp\opencode\pv\`, Base UI Select diklik via `el.click()` di `page.evaluate`) + commit terpisah.

| Stage | Cakupan |
|---|---|
| **1** | Foundation (§3.4) + root layout font + sidebar slate-900 9 menu + Event List rebuild |
| **2** | Event Detail: header copyable, panel aksi, konsolidasi 8 tab |
| **3** | Event wizard 4 langkah |
| **4** | Halaman baru: `/inbox`, `/tasks`, `/financials`, `/audit-log` |
| **5** | Dashboard + Master data wiring (**+ prasyarat RPC deactivate §7.1**) + Admin + Account/Security + Auth pages + analytics rebuild |

## 9. Konflik dengan dokumen lain & resolusi

| Konflik | Resolusi |
|---|---|
| DESIGN.md §3.1 font bawaan vs prototipe Plus Jakarta/JetBrains | **Prototipe menang** (§4) |
| DESIGN.md §3.1 primary near-black vs prototipe indigo | **Prototipe menang** (§4) |
| DESIGN.md §5.1 badge variant table vs group-color sekarang | **Group-color dipertahankan** (palet tunggal bersama donut); DESIGN.md diperbarui |
| Prototipe label English vs DESIGN.md §5.3 Indonesia | **Indonesia menang** (labels.ts) |
| Prototipe hand-rolled vs DESIGN.md §3.2 shadcn | **Shadcn menang** |
| `/estimator` (prototipe) vs PRD Phase 4 gate | **Defer**, tampil nonaktif |

DESIGN.md dan PROJECT_STATUS.md diperbarui di akir Stage 1 untuk merefleksikan keputusan ini.

## 10. Testing & Verification

- **Static:** `npm run lint`, `npx tsc --noEmit`, `npm run build` per stage
- **Browser E2E:** Playwright (instalasi luar repo, pola yang sudah baku); verifikasi: shell render, 9 menu role-gated, Event List responsive 360px (kartu), Event Detail 8 tab, wizard 4 langkah + submit + Event ID, halaman baru render
- **Data uji:** apa pun yang dibuat di Supabase Cloud untuk verifikasi wajib dibersihkan (proyek tidak punya staging terpisah)
- **Jangan:** menambah dependency UI baru (shadcn + lucide + recharts yang ada cukup); `next/font/google` adalah pengecualian satu-satunya untuk font

## 11. Open Items

- Apakah `max-w-7xl` diterapkan global atau per-layar? → default global, list/form bisa override
- Halaman `/tasks` global: apakah perlu filter "per event" atau "semua task saya" cukup? → default "saya", filter event opsional
- Audit log `/audit-log`: retensi & pagination (volume tinggi) → paginasi server-side 25/baris dari awal
