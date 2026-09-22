# EMOCS — Event Management & Operational Control System

Sistem internal untuk mengelola seluruh lifecycle event jasa pelatihan & sertifikasi
kompetensi: Event Request → review → eksekusi → financial closing. Single source of truth
agar Sales tahu progres tanpa bertanya via WhatsApp.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind v4 + shadcn/ui (Base UI) ·
react-hook-form + Zod v4 · Supabase Postgres (RLS, trigger, RPC) + Auth + Storage + Realtime ·
Resend (email) · npm.

## Mulai

```bash
npm install
cp .env.local.example .env.local   # isi kredensial Supabase + Resend
npm run dev                        # http://localhost:3000
```

Perintah utama: `npm run dev` · `npm run build` · `npm run lint` ·
`npm run type-check` · `supabase db push` · `supabase gen types typescript --local > types/database.types.ts`

## Dokumen (sumber kebenaran)

| Dokumen | Isi |
|---|---|
| `PRD EMOCS — Product Requirements Document.md` | Kebutuhan & keputusan bisnis (v1.1) |
| `System_Design.md` | Arsitektur, data model, state machine, API, security |
| `DESIGN.md` | UI/UX, visual system, mobile, aksesibilitas |
| `AGENTS.md` | **Instruksi wajib AI coding agent — baca ini sebelum coding** |
| `PROJECT_STATUS.md` | Checkpoint implementasi, bug, next steps, pola yang dipertahankan |

Aturan tersingkat: mutasi status hanya via `transition_event_status()`; RLS di semua tabel;
soft delete; Event ID dari database; jangan pakai `service_role` di jalur user;
perubahan skema hanya lewat `supabase/migrations`.
