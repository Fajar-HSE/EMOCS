# AGENTS.md — EMOCS (Event Management & Operational Control System)

> File ini adalah instruksi wajib untuk AI coding agent (Claude Code, Cursor, Copilot Workspace, dll.) yang bekerja di repo ini. Sumber kebenaran: kebutuhan bisnis → `PRD EMOCS — Product Requirements Document.md`; implementasi teknis → `System_Design.md`; UI/UX → `DESIGN.md`; checkpoint implementasi terkini → `PROJECT_STATUS.md`. File ini adalah ringkasan **actionable** untuk dipakai sehari-hari saat coding. Jika ada konflik antara permintaan sesaat user dan aturan "Non-Negotiable" di bawah, **berhenti dan konfirmasi eksplisit** sebelum melanjutkan.

## 1. Ringkasan Proyek

EMOCS menggantikan alur Google Form → Spreadsheet → WhatsApp untuk bisnis jasa pelatihan & sertifikasi kompetensi. Inti sistem: **Event ID** sebagai business key yang mengikat seluruh siklus hidup event (request → approval → eksekusi → financial closing → BI).

Status implementasi (detail & bukti verifikasi: `PROJECT_STATUS.md`):
- **Phase 1 (MVP) — SELESAI**, diverifikasi end-to-end di browser (AC lulus).
- **Phase 2 — SELESAI** (8/8 fitur: trainer/venue/equipment, checklist & task template, issue, dokumen, peserta, change request, email via Resend).
- **Phase 3 (Financial) — BERJALAN**: Stage A–G selesai & di-commit; sisa Stage H (MFA FINANCE/ADMIN, tidak blocking) + acceptance pass menyeluruh.
- **Phase 4 (BI) — belum diminta.**

Prinsip desain yang tidak boleh dilupakan saat implementasi apa pun:
- **Visibility di atas segalanya** — setiap fitur diuji dengan: "apakah ini menghilangkan kebutuhan bertanya status via WhatsApp?"
- **Database sebagai penjaga terakhir** — UI bisa dilewati, RLS dan constraint tidak.
- **Data quality > kecepatan fitur** — jangan bangun modul baru di atas data yang belum disiplin (lihat §4).

## 2. Tech Stack (Fixed — Jangan Diganti Tanpa Persetujuan Eksplisit)

| Layer | Teknologi |
|---|---|
| Framework | **Next.js 16** App Router (Turbopack), TypeScript **strict** |
| UI | Tailwind CSS v4 + **shadcn/ui v4 (Base UI — bukan Radix)** + lucide-react |
| Form & Validasi | react-hook-form + **Zod v4** (`@hookform/resolvers`) — **satu skema, tiga tempat** (lihat §6) |
| State server | TanStack Query — hanya untuk layar interaktif, bukan default |
| Database | Supabase Postgres (RLS wajib, trigger, view) |
| Auth | Supabase Auth — Google OAuth (utama) + email/password (fallback), invite-only |
| Storage | Supabase Storage — bucket privat + signed URL, tidak pernah publik |
| Realtime | Supabase Realtime (notifikasi, status update) |
| Email | Resend (HTTP API via `lib/services/email-service.ts`) |
| Job terjadwal | `pg_cron` (contoh: `check_overdue_tasks()`) |
| Testing | Vitest (unit) · Playwright (E2E) · **pgTAP (RLS — wajib)** — *lihat catatan §9: belum terpasang* |
| Hosting | Vercel (Singapore) + Supabase (`ap-southeast-1`) |
| Package manager | **npm** (package-lock.json) |

Arsitektur: **Option A — Rapid Development** (Next.js+Supabase satu ekosistem), dipilih atas Option B (microservices terpisah) — analisis skor lengkap di `System_Design.md` §18.1. Jangan usulkan migrasi ke arsitektur terpisah kecuali diminta eksplisit dan ada perubahan skala yang nyata.

## 3. Struktur Repositori (Aktual)

```text
/app
  /(auth)/login, /forgot-password, /reset-password, /auth/callback
  /(dashboard)
    /dashboard              → per role (Sales/Ops/Management)
    /events                 → list
    /events/new             → wizard request 4 langkah
    /events/[id]            → detail: header status + panel aksi + tab panel
                             (task, checklist, resources, dokumen, peserta,
                              issue, keuangan, change request)
    /master/*               → customers, trainings, cities, trainers, venues,
                              equipment, checklist-templates, task-templates,
                              vendors, cost-categories, approval-thresholds
    /admin                  → user & role (invite)
    /account/security       → password & MFA
  /api/v1/...               → BELUM ADA; dibuat saat webhook/integrasi benar-benar dibutuhkan
/components  (ui/, shared/)
/lib
  /supabase     (server.ts, client.ts, admin.ts ← service_role, proxy.ts)
  /validations  (event.ts, task.ts, expense.ts, budget.ts, dst.) ← skema Zod, single source of truth
  /auth         (session.ts ← requireAuth(), roles.ts ← hasAnyRole())
  /services     (email-service.ts, notification-dispatch.ts)
  /utils        (csv.ts)
/actions        (event-actions.ts, task-actions.ts, expense-actions.ts, dst.) ← Server Actions
/proxy.ts                   ← middleware Next 16 (bukan middleware.ts)
/scripts        (dev-set-admin-password.mjs, stageb-verify.mjs — dev utility)
/supabase
  /migrations   (0001–0029, ...) ← seluruh skema, RLS, trigger — SATU-SATUNYA jalur perubahan skema
  /tests/database (pgTAP: rls_enabled.sql)
  /seed.sql
/types          (database.types.ts ← hasil generate, jangan edit manual)
```

**Aturan:** perubahan skema database **hanya** lewat file migrasi di `/supabase/migrations`, lalu `supabase db push`. Mengklik langsung di dashboard Supabase produksi **dilarang** — penyebab paling umum lingkungan tidak sinkron.

## 4. Phase Gate — Jangan Bangun Fitur Phase Berikutnya Tanpa Diminta

| Phase | Fokus | Status |
|---|---|---|
| 1 (MVP) | Event Request, Status Workflow, PIC Assignment, Task, Dashboard, Notifikasi, Audit, RLS | **SELESAI** |
| 2 | Trainer/Venue/Equipment, Participant (UU PDP), Documents, Issues, Checklist, Change Request, Email | **SELESAI** (WhatsApp notifikasi ditunda — `[OQ-19]`) |
| 3 | Budget, Expense, Revenue, Margin, Financial Closing, MFA FINANCE/ADMIN | **BERJALAN** — Stage A–G selesai; sisa Stage H (MFA) + acceptance pass |
| 4 | Cost Benchmark, Estimator, Profitability Analysis, Forecasting | Belum diminta |

- Instruksi user aktif: **lanjutkan Phase 3 sampai selesai** (lihat `PROJECT_STATUS.md` §6 untuk next steps terperinci). Setelah Stage H: rekomendasikan acceptance pass menyeluruh (satu alur PUBLIC + satu INHOUSE penuh, angka layar dicocokkan dengan query SQL).
- **Larangan scope creep:** jangan bangun fitur Phase 4 "sekalian" meskipun terasa kecil. BI tanpa data historis yang cukup = estimasi yang menyesatkan (PRD §20). Selalu tanyakan phase mana yang sedang dikerjakan bila tidak jelas dari konteks task.
- Item ter-tunda yang butuh keputusan/permintaan eksplisit user: ringkasan total actual cost untuk Sales (PRD mengizinkan, tapi tab Financial saat ini disembunyikan dari Sales — jangan sekadar buka tab yang menampilkan rincian per expense, BR-FIN-15), integrasi WhatsApp, acceptance pass Phase 2.

Fitur di luar scope seluruh phase (jangan pernah usulkan/implementasikan tanpa instruksi eksplisit): portal peserta publik, LMS, integrasi langsung ke BNSP/LSP, e-sertifikat generator publik, payroll trainer otomatis, sistem akuntansi/pajak, mobile app native.

## 5. Non-Negotiable Architecture Rules

1. **RLS wajib `ENABLE` di setiap tabel baru, tanpa kecuali.** Tabel tanpa RLS bisa dibaca siapa pun yang punya `anon key` (ada di bundel JS browser). Item wajib code review. Test penjaga: `supabase/tests/database/rls_enabled.sql`.
2. **`service_role` key tidak pernah dipakai di jalur permintaan pengguna** — hanya cron/job admin (`lib/supabase/admin.ts`; satu-satunya pemakai sah saat ini: `lib/services/notification-dispatch.ts`). Dipakai di Server Action biasa = seluruh RLS jadi tidak berguna.
3. **Transisi status event hanya lewat satu jalur**: Server Action (`actions/event-actions.ts`) → RPC `transition_event_status()`. Tidak pernah `UPDATE events SET status = ...` langsung. Ditegakkan tiga lapis: matriks data-driven `event_status_transitions` + fungsi `transition_event_status()` + trigger penjaga `guard_event_status_change()`. Endpoint `POST /api/v1/events/:id/transition` di `System_Design.md` §9 adalah desain untuk integrasi eksternal — belum diimplementasikan, jangan membuatnya "sekalian".
4. **Data finansial sensitif (`actual_cost`, `gross_margin_pct`, dst.) hidup di tabel terpisah** (`event_financials` via compute functions, `expenses`, `financial_closings`), bukan kolom di `events`. Keputusan keamanan, bukan normalisasi — RLS bekerja per baris; akses dikontrol `can_view_event_financials()`.
5. **Zod: satu skema, dipakai tiga tempat** — form klien (`zodResolver`), Server Action (`safeParse`, tidak pernah percaya klien), dan tipe TypeScript (`z.infer`). Jangan duplikasi definisi validasi.
6. **Audit trail via trigger generik `fn_audit()`** wajib terpasang di seluruh tabel utama (event, task, permission, financial, master data). Append-only — tidak ada UPDATE/DELETE pada `audit_logs`.
7. **Soft delete only** (`deleted_at timestamptz null`). Tidak ada hard delete di tabel manapun kecuali eksplisit dinyatakan lain. Seluruh query & policy wajib filter `deleted_at is null`.
8. **Event ID (`EVT-YYYY-NNNNNN`) immutable, digenerate di database** via `generate_event_code()` + tabel `event_number_counters` (atomik, bebas race). Tidak pernah diedit, tidak pernah dipakai ulang. Draft tidak mendapat Event ID.
9. **Uang**: `numeric(18,2)`, tidak pernah `float`. **Waktu**: `timestamptz` (UTC) untuk penyimpanan, ditampilkan Asia/Jakarta (WIB).
10. **Setiap Server Action wajib**: (1) validasi Zod, (2) verifikasi sesi (`requireAuth()`), (3) verifikasi izin/role (`hasAnyRole()` — jangan andalkan RLS saja untuk UX error yang baik), (4) pakai klien Supabase ber-sesi user, (5) tulis audit bila relevan, (6) `revalidatePath`.
11. **Master data yang sudah dipakai transaksi tidak dapat dihapus**, hanya dinonaktifkan (`is_active = false`) — ditegakkan `guard_master_data_in_use()`.
12. **"Issue" bukan status event** — jangan pernah modelkan sebagai state di `event_status`. Issue adalah entitas terpisah (`event_issues`) yang menempel ke event via flag (`has_open_critical_issue`), ditampilkan sebagai badge. Event tetap di status operasionalnya (mis. `PREPARATION`) sambil ada issue terbuka.

## 6. Pola Kode Wajib

### 6.1 Zod — Single Source of Truth
```ts
// lib/validations/event.ts
export const eventRequestSchema = z.object({ ... })
  .refine(d => d.end_date >= d.start_date, { message: "...", path: ["end_date"] });

export type EventRequestInput = z.infer<typeof eventRequestSchema>;
// Draft schema selalu .partial() dari schema submit — draft boleh tidak lengkap, submit tidak boleh.
// Pesan error dalam Bahasa Indonesia yang bisa dibaca user (bukan pesan generik library).
```

### 6.2 Server Action — Template Wajib (sesuai konvensi kode aktual)
```ts
"use server";
export async function submitEvent(input: EventRequestInput) {
  const parsed = eventRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten() };

  const ctx = await requireAuth();            // lib/auth/session.ts — sesi + roles + profile
  if (!hasAnyRole(ctx.roles, ["SALES", "SALES_MANAGER"]))
    return { ok: false, error: "FORBIDDEN" };

  const supabase = await createClient();      // sesi user, BUKAN service_role
  // ...insert / rpc; trigger DB menulis audit & generate event_code...
  revalidatePath("/events");
  return { ok: true, eventId, eventCode };
}
```

### 6.3 Error RPC → Pesan Ramah (pola `mapXxxError` — WAJIB dipertahankan)
Setiap file actions finansial punya fungsi privat `mapXxxError(error)` — `switch` yang mencocokkan `error.message` (string RAISE EXCEPTION dari migration) ke pesan Bahasa Indonesia, jatuh ke `error.message` mentah untuk yang belum dipetakan. Untuk RPC/UI baru: **tambah `case` ke fungsi yang sudah ada, jangan buat mekanisme mapping baru yang beda gaya.** Jangan pernah tampilkan pesan error mentah Postgres ke user.

### 6.4 Dialog Master Data — Refresh List (bug nyata yang sudah di-fix)
Setelah create/update di dialog: `revalidatePath` di Server Action saja **tidak cukup** memaksa re-render Server Component yang sudah ter-mount. Semua dialog CRUD wajib juga memanggil `useRouter()` + `router.refresh()` setelah menutup dialog (pola di semua `*-dialog.tsx`).

### 6.5 RLS — Pola Dasar (sesuai implementasi aktual)
```sql
create policy "event_select" on public.events for select to authenticated
using (
  deleted_at is null and (
       public.has_role('ADMIN') or public.has_role('MANAGEMENT')
    or public.has_role('OPERATIONS_MANAGER') or public.has_role('FINANCE')
    or (public.has_role('OPERATIONS') and (pic_user_id = auth.uid() or backup_pic_user_id = auth.uid()))
    or (public.has_role('SALES') and sales_user_id = auth.uid())
    or (public.has_role('SALES_MANAGER') and /* sesuai tim via profiles.team_id */ ...)
  )
);
```
Role disematkan ke JWT lewat Custom Access Token Hook (`auth.jwt() -> 'app_metadata' -> 'roles'`) — **`public.has_role()`**, bukan subquery role per baris, demi performa.

## 7. Checklist Wajib Saat Menambah Tabel Baru

1. Tulis migration file di `/supabase/migrations/00xx_*.sql` — jangan pernah lewat dashboard.
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` — tanpa terkecuali.
3. Tulis policy select/insert/update/delete eksplisit sesuai Permission Matrix (`System_Design.md` §10.3).
4. Pasang trigger `fn_audit()` jika tabel termasuk kategori sensitif (event, financial, permission, master data).
5. Tambahkan `created_at, created_by, updated_at, updated_by, deleted_at` di tabel transaksional utama.
6. Tambahkan index pada setiap foreign key (Postgres tidak membuatnya otomatis) dan kolom yang muncul di filter dashboard.
7. Tulis test pgTAP yang memverifikasi RLS aktif dan policy bekerja sesuai role (lihat `supabase/tests/database/`).
8. Generate ulang types: `supabase gen types typescript --local > types/database.types.ts` — jangan edit file ini manual.
9. Jika perubahan struktural, update ERD di `System_Design.md` §6 dan catat di `PROJECT_STATUS.md`.

## 8. State Machine — Ringkasan

```
DRAFT → SUBMITTED → UNDER_REVIEW → (REVISION_REQUESTED → kembali) / APPROVED / REJECTED
APPROVED → PIC_ASSIGNED → PREPARATION → READY → RUNNING → COMPLETED → POST_EVENT
POST_EVENT → FINANCIAL_CLOSING (Phase 3) → CLOSED (terminal, read-only, butuh reopen untuk edit)
Dari status mana pun sebelum CLOSED → CANCELLED / POSTPONED (wajib alasan)
```

- Matriks transisi yang sah = **data** di tabel `event_status_transitions` (dibaca `transition_event_status()`), bukan hardcode. Detail syarat masuk tiap status, aktor, dan aturan transisi: `System_Design.md` §8.
- Guard tambahan di `markReady()` (`actions/event-actions.ts`): PREPARATION→READY diblokir bila (1) task wajib, (2) checklist wajib, atau (3) issue CRITICAL terbuka — tiga pengecekan paralel dengan pesan error spesifik per kondisi.
- **Jangan implementasikan shortcut transisi** (mis. langsung DRAFT → APPROVED) meskipun terasa lebih efisien untuk testing — pakai seed data / alur sah, bukan modifikasi state machine.

## 9. Testing & Definition of Done

> **Realitas testing saat ini:** Vitest dan Playwright **belum terpasang** (tidak ada di `package.json`). Praktik verifikasi yang berlaku dan sudah terbukti: **verifikasi manual end-to-end di browser sungguhan** (pola Stage 9 Phase 1 / tiap stage Phase 2–3, lihat `PROJECT_STATUS.md`), `npm run lint`, dan `npx tsc --noEmit`. Strategi testing target lengkap ada di `System_Design.md` §15 — ikuti saat mulai menulis test (pgTAP `rls_enabled.sql` sudah ada dan wajib dipertahankan hijau).

Sebelum menandai task selesai, pastikan:
- [ ] Kode selesai & (secara logis) siap direview
- [ ] Skema Zod dipakai di klien & server (bukan validasi manual terpisah)
- [ ] RLS aktif di tabel terkait; test pgTAP tetap lulus (bila menyentuh policy)
- [ ] Error RPC dipetakan ke pesan ramah (pola §6.3); tidak ada error mentah ke user
- [ ] Empty / loading (skeleton) / error state tersedia di setiap layar baru
- [ ] Mobile responsive teruji (viewport 360px) — Operations bekerja dari lapangan
- [ ] Audit log tercatat bila tabel/aksi relevan
- [ ] Tidak ada `console.log` / `TODO` tertinggal
- [ ] Business rule (`BR-*`, lihat `System_Design.md` §7) yang relevan sudah ditegakkan di layer yang benar (Zod / Server Action / DB constraint)
- [ ] Untuk fitur alur kerja: diverifikasi end-to-end di browser dengan skenario nyata (buat → jalankan → bersihkan data uji), bukan hanya "kodenya jalan"
- [ ] Data uji dan role sementara dibersihkan tuntas setelah verifikasi

## 10. Commands (npm — sesuai `package.json` aktual)

```bash
npm run dev             # Next dev (Turbopack)
npm run build           # build produksi
npm run lint            # ESLint
npx tsc --noEmit        # type-check (tidak ada script khusus di package.json)
supabase db push        # jalankan migrasi ke project aktif
supabase gen types typescript --local > types/database.types.ts
# Testing belum terpasang: tidak ada script test di package.json.
# pgTAP: supabase/tests/database/rls_enabled.sql (jalankan di local/staging).
# Dev utility: scripts/dev-set-admin-password.mjs, scripts/stageb-verify.mjs
```

## 11. Larangan Eksplisit (Do NOT)

- Jangan bangun fitur Phase 4 (BI/estimator/forecasting) sebelum diminta eksplisit.
- Jangan buka akses finansial melewati Permission Matrix (`System_Design.md` §10.3) — khususnya: jangan tampilkan rincian expense/margin ke Sales (BR-FIN-15); beberapa visibilitas masih `[OQ-n]` (PRD Bagian 32) dan butuh konfirmasi bisnis sebelum di-hardcode.
- Jangan modelkan "Issue" sebagai status event.
- Jangan `UPDATE`/`PATCH` field `status` secara langsung — selalu lewat RPC `transition_event_status()` (via Server Action).
- Jangan hard-delete data apa pun — soft delete only.
- Jangan pakai `service_role` di kode yang dieksekusi atas permintaan user biasa.
- Jangan buat tabel baru tanpa RLS "untuk sementara, nanti ditambah" — tidak ada iterasi kedua untuk ini.
- Jangan generate Event ID di aplikasi (harus di DB via `generate_event_code()`).
- Jangan asumsikan keputusan pada `[OQ-n]` di PRD Bagian 32 (Assumptions & Open Questions) — tanyakan ke user bila implementasi menyentuh area tersebut (mis. ambang approval — yang di-seed ditandai `[ASSUMPTION]`, definisi revenue, retensi data).
- Jangan ganti package manager (npm) atau upgrade dependency besar tanpa instruksi eksplisit.
- Jangan buat integrasi WhatsApp tanpa instruksi eksplisit (ditunda user — gunakan penyedia WABA resmi bila nanti diminta).

## 12. Referensi

| Dokumen | Isi | Bagian kunci |
|---|---|---|
| `PRD EMOCS — Product Requirements Document.md` | Sumber kebenaran bisnis & requirement (v1.1) | §22 scope MVP, §26 AC, §32 Open Questions |
| `System_Design.md` | Desain teknis mendalam (ERD, state machine, API, security, BR) | §6 ERD · §7 BR-* · §8 State Machine · §9 API · §10.3 Permission Matrix · §18 ADR |
| `DESIGN.md` | Sumber kebenaran UI/UX (visual system, layout, interaksi, aksesibilitas) | §5 bahasa visual status, §10 aturan mobile 360px |
| `PROJECT_STATUS.md` | Checkpoint implementasi paling akurat: apa selesai, bug, next steps, pola yang harus dipertahankan | §1 status, §6 next steps, §7 pola |
| Plan file (di luar repo) | Rencana Phase 3 stage A–H | path di `PROJECT_STATUS.md` header |

Peta penomoran `System_Design.md` (penulisan ulang 2026-09-14): rujukan lama §3 (state machine) → **§8**; §5 (ERD) → **§6**; §7 (Permission Matrix) → **§10.3**; §14 (Business Rules) → **§7**.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
