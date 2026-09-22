"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { issueSchema } from "@/lib/validations/issue"
import { dispatchPendingNotificationEmails } from "@/lib/services/notification-dispatch"

export type IssueActionResult = { ok: boolean; message?: string }

// event_issues_insert RLS lets any authenticated user report an issue —
// Sales spotting a customer complaint shouldn't need an Ops role to flag it.
export async function createIssue(eventId: string, input: unknown): Promise<IssueActionResult> {
  const ctx = await requireAuth()
  const parsed = issueSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from("event_issues").insert({
    event_id: eventId,
    title: parsed.data.title,
    category: parsed.data.category,
    severity: parsed.data.severity,
    description: parsed.data.description || null,
    assignee_user_id: parsed.data.assignee_user_id || null,
    due_date: parsed.data.due_date || null,
    created_by: ctx.userId,
  })

  if (error) return { ok: false, message: error.message }
  await dispatchPendingNotificationEmails()
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function updateIssueStatus(
  issueId: string,
  eventId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  resolution?: string,
  rootCause?: string
): Promise<IssueActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase
    .from("event_issues")
    .update({
      status,
      resolution: resolution || null,
      root_cause: rootCause || null,
      resolved_at: status === "RESOLVED" || status === "CLOSED" ? new Date().toISOString() : null,
    })
    .eq("id", issueId)

  if (error) {
    if (error.code === "23514") {
      return { ok: false, message: "Root cause wajib diisi untuk menutup issue HIGH/CRITICAL" }
    }
    return { ok: false, message: error.message }
  }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
