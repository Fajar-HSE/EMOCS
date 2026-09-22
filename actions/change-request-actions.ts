"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { changeRequestSchema } from "@/lib/validations/change-request"
import { dispatchPendingNotificationEmails } from "@/lib/services/notification-dispatch"

export type ChangeRequestActionResult = { ok: boolean; message?: string }

// event_change_requests_insert RLS lets any authenticated user who can see
// the event submit one — Sales is usually the one who learns about a
// customer's rescheduling request, not Ops. old_value is read from the
// event row server-side rather than trusted from the client.
export async function createChangeRequest(eventId: string, input: unknown): Promise<ChangeRequestActionResult> {
  const ctx = await requireAuth()
  const parsed = changeRequestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: event } = await supabase
    .from("events")
    .select("start_date, end_date, location_name, participant_count, training_id")
    .eq("id", eventId)
    .single()

  if (!event) return { ok: false, message: "Event tidak ditemukan" }

  const oldValue = event[parsed.data.field_name as keyof typeof event]

  const { error } = await supabase.from("event_change_requests").insert({
    event_id: eventId,
    requested_by: ctx.userId,
    field_name: parsed.data.field_name,
    old_value: oldValue != null ? String(oldValue) : null,
    new_value: parsed.data.new_value,
    reason: parsed.data.reason,
    cost_impact_note: parsed.data.cost_impact_note || null,
  })

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

// apply_change_request() itself enforces OPERATIONS_MANAGER/ADMIN — this
// action is a thin wrapper that also flushes the CHANGE_REQUEST_APPROVED
// notification emails the function queues.
export async function decideChangeRequest(
  requestId: string,
  eventId: string,
  approve: boolean,
  rejectionReason?: string
): Promise<ChangeRequestActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.rpc("apply_change_request", {
    p_request_id: requestId,
    p_approve: approve,
    p_rejection_reason: rejectionReason,
  })

  if (error) return { ok: false, message: error.message }
  if (approve) await dispatchPendingNotificationEmails()
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
