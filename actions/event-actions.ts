"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth/session"
import { eventDraftSchema, eventRequestSchema, type EventDraftInput } from "@/lib/validations/event"
import { dispatchPendingNotificationEmails } from "@/lib/services/notification-dispatch"

export type EventActionResult = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
  id?: string
  eventCode?: string
  duplicateOf?: { id: string; event_code: string | null; event_name: string } | null
}

export async function createEventDraft(input: unknown): Promise<EventActionResult> {
  const ctx = await requireAuth()
  const parsed = eventDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .insert({
      company_id: ctx.profile.company_id,
      sales_user_id: ctx.userId,
      sales_team_id: ctx.profile.team_id,
      event_name: parsed.data.event_name || "(Draft belum diberi nama)",
      customer_id: parsed.data.customer_id ?? null,
      contact_id: parsed.data.contact_id ?? null,
      training_id: parsed.data.training_id ?? null,
      event_type: parsed.data.event_type ?? null,
      delivery_mode: parsed.data.delivery_mode ?? null,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      start_time: parsed.data.start_time || null,
      end_time: parsed.data.end_time || null,
      location_type: parsed.data.delivery_mode === "ONLINE" ? (parsed.data.location_type ?? "ONLINE") : (parsed.data.location_type ?? null),
      location_name: parsed.data.location_name || null,
      city_id: parsed.data.city_id ?? null,
      participant_count: parsed.data.participant_count ?? null,
      description: parsed.data.description || null,
      special_requirements: parsed.data.special_requirements || null,
      sales_value: parsed.data.sales_value ?? null,
      po_status: parsed.data.po_status ?? "NO_PO",
      po_number: parsed.data.po_number || null,
      payment_term: parsed.data.payment_term ?? null,
      customer_reference: parsed.data.customer_reference || null,
      priority: parsed.data.priority ?? "NORMAL",
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/events")
  return { ok: true, id: data.id }
}

function eventPatchFromDraft(parsed: EventDraftInput) {
  return {
    event_name: parsed.event_name || "(Draft belum diberi nama)",
    customer_id: parsed.customer_id ?? null,
    contact_id: parsed.contact_id ?? null,
    training_id: parsed.training_id ?? null,
    event_type: parsed.event_type ?? null,
    delivery_mode: parsed.delivery_mode ?? null,
    start_date: parsed.start_date || null,
    end_date: parsed.end_date || null,
    start_time: parsed.start_time || null,
    end_time: parsed.end_time || null,
    location_type: parsed.delivery_mode === "ONLINE" ? (parsed.location_type ?? "ONLINE") : (parsed.location_type ?? null),
    location_name: parsed.location_name || null,
    city_id: parsed.city_id ?? null,
    participant_count: parsed.participant_count ?? null,
    description: parsed.description || null,
    special_requirements: parsed.special_requirements || null,
    sales_value: parsed.sales_value ?? null,
    po_status: parsed.po_status ?? "NO_PO",
    po_number: parsed.po_number || null,
    payment_term: parsed.payment_term ?? null,
    customer_reference: parsed.customer_reference || null,
    priority: parsed.priority ?? "NORMAL",
  }
}

export async function updateEventDraft(id: string, input: unknown): Promise<EventActionResult> {
  await requireAuth()
  const parsed = eventDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("events")
    .update(eventPatchFromDraft(parsed.data))
    .eq("id", id)
    .eq("status", "DRAFT")

  if (error) return { ok: false, message: error.message }
  revalidatePath("/events")
  return { ok: true, id }
}

// "Ubah" (dialog edit cepat) di Daftar Event untuk ADMIN / SALES_MANAGER /
// OPERATIONS_MANAGER. Scope baris ditentukan RLS events_update (tidak ada
// perubahan kebijakan): ADMIN/OM semua status non-CLOSED; SALES_MANAGER hanya
// event timnya yang berstatus SUBMITTED/REVISION_REQUESTED.
export async function updateEventDetails(id: string, input: unknown): Promise<EventActionResult> {
  await requireRole("ADMIN", "SALES_MANAGER", "OPERATIONS_MANAGER")
  const parsed = eventDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("events")
    .update(eventPatchFromDraft(parsed.data))
    .eq("id", id)

  if (error) {
    // PGRST205: RLS menolak baris (mis. SALES_MANAGER untuk event yang tidak
    // boleh diubahnya). Pesan yang bisa dibaca user lebih informatif.
    if (error.code === "PGRST205") {
      return { ok: false, message: "Anda tidak berhak mengubah event ini untuk status saat ini" }
    }
    return { ok: false, message: error.message }
  }
  revalidatePath("/events")
  revalidatePath(`/events/${id}`)
  return { ok: true, id }
}

function mapEventError(error: { message: string }): string {
  if (error.message.startsWith("FORBIDDEN")) return "Anda tidak berhak menghapus event ini"
  if (error.message.startsWith("EVENT_CLOSED")) return "Event berstatus CLOSED tidak bisa dihapus"
  if (error.message.startsWith("EVENT_NOT_FOUND")) return "Event tidak ditemukan atau sudah dihapus"
  return error.message
}

// "Hapus" (soft delete) di Daftar Event via RPC deactivate_event
// (0037_event_deactivate_rpc.sql). Policy UPDATE events punya WITH CHECK
// deleted_at IS NULL sehingga UPDATE langsung selalu tertolak — sama seperti
// pola deactivate_* master data. Hard delete tetap dilarang (BR-EVT-17).
export async function deactivateEvent(id: string): Promise<EventActionResult> {
  await requireRole("ADMIN", "SALES_MANAGER", "OPERATIONS_MANAGER")
  const supabase = await createClient()
  const { error } = await supabase.rpc("deactivate_event", { p_event_id: id })

  if (error) return { ok: false, message: mapEventError(error) }
  revalidatePath("/events")
  revalidatePath(`/events/${id}`)
  return { ok: true, id }
}

export async function checkPossibleDuplicate(
  customerId: string,
  trainingId: string,
  startDate: string,
  excludeEventId: string
) {
  const supabase = await createClient()
  const from = new Date(startDate)
  from.setDate(from.getDate() - 3)
  const to = new Date(startDate)
  to.setDate(to.getDate() + 3)

  const { data } = await supabase
    .from("events")
    .select("id, event_code, event_name")
    .eq("customer_id", customerId)
    .eq("training_id", trainingId)
    .neq("id", excludeEventId)
    .not("status", "in", "(DRAFT,CANCELLED)")
    .gte("start_date", from.toISOString().slice(0, 10))
    .lte("start_date", to.toISOString().slice(0, 10))
    .limit(1)
    .maybeSingle()

  return data ?? null
}

// M5/FR-EVT-02: DRAFT -> SUBMITTED. Re-validates the FULL schema (BR-EVT-04)
// server-side regardless of what the client sent, mints the Event ID inside
// transition_event_status() (§12.2.4), and flags possible duplicates
// (FR-EVT-04) as a soft warning rather than a block.
export async function submitEvent(id: string, confirmDuplicate = false): Promise<EventActionResult> {
  await requireAuth()
  const supabase = await createClient()

  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !event) return { ok: false, message: "Event tidak ditemukan" }

  const parsed = eventRequestSchema.safeParse({
    customer_id: event.customer_id,
    contact_id: event.contact_id ?? undefined,
    event_name: event.event_name,
    training_id: event.training_id,
    event_type: event.event_type,
    delivery_mode: event.delivery_mode,
    start_date: event.start_date,
    end_date: event.end_date,
    start_time: event.start_time ?? undefined,
    end_time: event.end_time ?? undefined,
    location_type: event.location_type,
    location_name: event.location_name ?? undefined,
    city_id: event.city_id ?? undefined,
    participant_count: event.participant_count,
    description: event.description ?? undefined,
    special_requirements: event.special_requirements ?? undefined,
    sales_value: event.sales_value ?? undefined,
    po_status: event.po_status,
    po_number: event.po_number ?? undefined,
    payment_term: event.payment_term ?? undefined,
    customer_reference: event.customer_reference ?? undefined,
    priority: event.priority,
  })

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, message: "Lengkapi field yang wajib diisi." }
  }

  if (!confirmDuplicate) {
    const duplicate = await checkPossibleDuplicate(
      parsed.data.customer_id,
      parsed.data.training_id,
      parsed.data.start_date,
      id
    )
    if (duplicate) {
      await supabase.from("events").update({ possible_duplicate: true }).eq("id", id)
      return { ok: false, duplicateOf: duplicate }
    }
  }

  const { data: result, error: rpcError } = await supabase.rpc("transition_event_status", {
    p_event_id: id,
    p_to_status: "SUBMITTED",
  })

  if (rpcError) return { ok: false, message: rpcError.message }

  await dispatchPendingNotificationEmails()
  revalidatePath("/events")
  return { ok: true, id, eventCode: (result as { event_code: string | null })?.event_code ?? undefined }
}

export async function createDraftAndRedirect() {
  const ctx = await requireAuth()
  const supabase = await createClient()
  if (!ctx.profile) throw new Error("Profil tidak ditemukan")

  const { data, error } = await supabase
    .from("events")
    .insert({
      company_id: ctx.profile.company_id,
      sales_user_id: ctx.userId,
      sales_team_id: ctx.profile.team_id,
      event_name: "(Draft belum diberi nama)",
      po_status: "NO_PO",
      priority: "NORMAL",
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Gagal membuat draft")
  redirect(`/events/new?draft=${data.id}`)
}

// ============================================================
// Stage 5 — Workflow (M6, M7), PIC Assignment (M8), Cancel/Postpone (M17)
// All of these are thin wrappers around the DB functions from Stage 1
// (transition_event_status / assign_pic) — role checks, adjacency, and
// reason requirements are already enforced there; these actions exist to
// give the UI a typed, ergonomic surface and a place to revalidate paths.
// ============================================================

async function callTransition(
  id: string,
  toStatus: string,
  reason?: string,
  cancellationCategory?: string
): Promise<EventActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("transition_event_status", {
    p_event_id: id,
    p_to_status: toStatus as never,
    p_reason: reason,
    p_cancellation_category: cancellationCategory as never,
  })
  if (error) return { ok: false, message: error.message }
  await dispatchPendingNotificationEmails()
  revalidatePath("/events")
  revalidatePath(`/events/${id}`)
  return { ok: true, id }
}

export async function reviewEvent(
  id: string,
  decision: "APPROVE" | "REJECT" | "REVISION",
  note?: string
): Promise<EventActionResult> {
  await requireAuth()
  if ((decision === "REJECT" || decision === "REVISION") && !note?.trim()) {
    return { ok: false, message: decision === "REJECT" ? "Alasan penolakan wajib diisi" : "Catatan revisi wajib diisi" }
  }

  // UNDER_REVIEW is an intermediate status Ops Manager passes through on
  // the way to a decision (PRD §10.1) — start it here so the history shows
  // "mulai review" even when the decision follows immediately.
  const supabase = await createClient()
  const { data: event } = await supabase.from("events").select("status").eq("id", id).single()
  if (event?.status === "SUBMITTED") {
    await callTransition(id, "UNDER_REVIEW")
  }

  const toStatus = decision === "APPROVE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "REVISION_REQUESTED"
  return callTransition(id, toStatus, note)
}

export async function cancelEvent(
  id: string,
  reason: string,
  category: string
): Promise<EventActionResult> {
  await requireAuth()
  if (!reason.trim()) return { ok: false, message: "Alasan pembatalan wajib diisi" }
  return callTransition(id, "CANCELLED", reason, category)
}

export async function postponeEvent(id: string, reason: string): Promise<EventActionResult> {
  await requireAuth()
  if (!reason.trim()) return { ok: false, message: "Alasan penundaan wajib diisi" }
  return callTransition(id, "POSTPONED", reason)
}

export async function startPreparation(id: string): Promise<EventActionResult> {
  await requireAuth()
  return callTransition(id, "PREPARATION")
}

export async function markReady(id: string): Promise<EventActionResult> {
  await requireAuth()
  const supabase = await createClient()

  const [{ count: taskCount }, { count: checklistCount }, { count: criticalIssueCount }] = await Promise.all([
    supabase
      .from("event_tasks")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("is_mandatory", true)
      .not("status", "eq", "DONE"),
    // BR-CHK-02: mandatory checklist items must be done before READY.
    supabase
      .from("event_checklists")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .is("deleted_at", null)
      .eq("is_mandatory", true)
      .eq("is_done", false),
    // BR-EVT-08/BR-EVT-09: an open CRITICAL issue blocks READY.
    supabase
      .from("event_issues")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .is("deleted_at", null)
      .eq("severity", "CRITICAL")
      .not("status", "in", "(RESOLVED,CLOSED)"),
  ])

  if (taskCount && taskCount > 0) {
    return { ok: false, message: `${taskCount} task wajib (mandatory) belum selesai.` }
  }
  if (checklistCount && checklistCount > 0) {
    return { ok: false, message: `${checklistCount} item checklist wajib belum selesai.` }
  }
  if (criticalIssueCount && criticalIssueCount > 0) {
    return { ok: false, message: `${criticalIssueCount} issue CRITICAL masih terbuka.` }
  }
  return callTransition(id, "READY")
}

export async function markRunning(id: string): Promise<EventActionResult> {
  await requireAuth()
  return callTransition(id, "RUNNING")
}

export async function markCompleted(id: string): Promise<EventActionResult> {
  await requireAuth()
  return callTransition(id, "COMPLETED")
}

export async function markPostEvent(id: string): Promise<EventActionResult> {
  await requireAuth()
  return callTransition(id, "POST_EVENT")
}

export async function startFinancialClosing(id: string): Promise<EventActionResult> {
  await requireAuth()
  return callTransition(id, "FINANCIAL_CLOSING")
}

// Phase 3 BR-FIN-10: reopening a CLOSED event goes back to FINANCIAL_CLOSING
// and always needs a reason — transition_event_status() itself enforces both
// the role gate (FINANCE/MANAGEMENT/ADMIN) and the reason requirement, and
// stamps the reopened financial_closings row (0029_phase3_financial_closing.sql).
export async function reopenClosedEvent(id: string, reason: string): Promise<EventActionResult> {
  await requireAuth()
  if (!reason.trim()) return { ok: false, message: "Alasan membuka kembali event wajib diisi" }
  return callTransition(id, "FINANCIAL_CLOSING", reason)
}

export type PicCandidate = {
  id: string
  full_name: string
  active_event_count: number
  overdue_task_count: number
}

export async function getPicCandidates(): Promise<PicCandidate[]> {
  await requireAuth()
  const supabase = await createClient()

  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, full_name, user_roles!user_roles_user_id_fkey(roles(name))")
    .eq("is_active", true)

  const relevant = (candidates ?? []).filter((p) =>
    (p.user_roles ?? []).some((ur) => ur.roles?.name === "OPERATIONS" || ur.roles?.name === "OPERATIONS_MANAGER")
  )

  const results: PicCandidate[] = []
  for (const p of relevant) {
    const [{ count: eventCount }, { count: taskCount }] = await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("pic_user_id", p.id)
        .not("status", "in", "(CLOSED,CANCELLED)"),
      supabase
        .from("event_tasks")
        .select("id", { count: "exact", head: true })
        .eq("assignee_user_id", p.id)
        .not("status", "in", "(DONE,CANCELLED)")
        .lt("due_date", new Date().toISOString().slice(0, 10)),
    ])
    results.push({
      id: p.id,
      full_name: p.full_name,
      active_event_count: eventCount ?? 0,
      overdue_task_count: taskCount ?? 0,
    })
  }
  return results
}

export async function assignPic(
  eventId: string,
  picUserId: string,
  backupPicUserId?: string,
  responsibilityNote?: string
): Promise<EventActionResult> {
  await requireAuth()
  if (backupPicUserId && backupPicUserId === picUserId) {
    return { ok: false, message: "Backup PIC tidak boleh sama dengan PIC utama" }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("assign_pic", {
    p_event_id: eventId,
    p_pic_user_id: picUserId,
    p_backup_pic_user_id: backupPicUserId,
    p_responsibility_note: responsibilityNote,
  })

  if (error) return { ok: false, message: error.message }
  await dispatchPendingNotificationEmails()
  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)
  return { ok: true, id: eventId }
}
