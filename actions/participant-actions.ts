"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { participantSchema, participantBillingSchema, type ParticipantInput } from "@/lib/validations/participant"

export type ParticipantActionResult = { ok: boolean; message?: string; count?: number }
export type ParticipantExportRow = {
  full_name: string
  company_name: string | null
  job_title: string | null
  email: string | null
  phone: string | null
  registration_status: string
  certificate_status: string | null
}

function toRow(eventId: string, input: ParticipantInput, createdBy: string) {
  return {
    event_id: eventId,
    full_name: input.full_name,
    company_name: input.company_name || null,
    job_title: input.job_title || null,
    email: input.email || null,
    phone: input.phone || null,
    nik: input.nik || null,
    created_by: createdBy,
  }
}

export async function createParticipant(eventId: string, input: unknown): Promise<ParticipantActionResult> {
  const ctx = await requireAuth()
  const parsed = participantSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from("participants").insert(toRow(eventId, parsed.data, ctx.userId))
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

// Rows have already been parsed and previewed client-side (CSV import) —
// this re-validates each one server-side rather than trusting the client.
export async function bulkCreateParticipants(eventId: string, rows: unknown[]): Promise<ParticipantActionResult> {
  const ctx = await requireAuth()
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, message: "Tidak ada data untuk diimpor" }
  if (rows.length > 1000) return { ok: false, message: "Maksimal 1000 baris per import" }

  const parsedRows: ReturnType<typeof toRow>[] = []
  for (const [i, row] of rows.entries()) {
    const parsed = participantSchema.safeParse(row)
    if (!parsed.success) {
      return { ok: false, message: `Baris ${i + 1}: ${parsed.error.issues[0].message}` }
    }
    parsedRows.push(toRow(eventId, parsed.data, ctx.userId))
  }

  const supabase = await createClient()
  const { error } = await supabase.from("participants").insert(parsedRows)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true, count: parsedRows.length }
}

export async function deleteParticipant(id: string, eventId: string): Promise<ParticipantActionResult> {  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase
    .from("participants")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

// Billing per peserta (unit_price/billing_status/payment_status) — penggerak
// revenue event PUBLIC. Izin tulis mengikuti policy participants_write yang
// sudah ada (PIC event / OPERATIONS_MANAGER / ADMIN); tidak perlu migrasi.
export async function updateParticipantBilling(
  id: string,
  eventId: string,
  input: unknown
): Promise<ParticipantActionResult> {
  await requireAuth()
  const parsed = participantBillingSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from("participants")
    .update({
      unit_price: parsed.data.unit_price ?? null,
      billing_status: parsed.data.billing_status,
      payment_status: parsed.data.payment_status,
    })
    .eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function recordAttendance(
  participantId: string,
  eventId: string,
  attendanceDate: string,
  isPresent: boolean
): Promise<ParticipantActionResult> {
  const ctx = await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.from("participant_attendance").upsert(
    {
      participant_id: participantId,
      attendance_date: attendanceDate,
      is_present: isPresent,
      recorded_by: ctx.userId,
      recorded_at: new Date().toISOString(),
    },
    { onConflict: "participant_id,attendance_date" }
  )
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

// BR-PAR-03: every export must be audit-logged. Returns the rows so the
// client can build the actual CSV file — the logging is the part that must
// happen server-side (log_participant_export runs as the caller via
// auth.uid(), recorded in audit_logs).
export async function exportParticipants(
  eventId: string
): Promise<ParticipantActionResult & { rows?: ParticipantExportRow[] }> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("participants")
    .select("full_name, company_name, job_title, email, phone, registration_status, certificate_status")
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .order("full_name")

  if (error) return { ok: false, message: error.message }

  const { error: logError } = await supabase.rpc("log_participant_export", {
    p_event_id: eventId,
    p_count: data.length,
  })
  if (logError) return { ok: false, message: logError.message }

  return { ok: true, rows: data }
}
