"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole, requireAAL2 } from "@/lib/auth/session"
import { budgetItemsSchema } from "@/lib/validations/budget"
import { dispatchPendingNotificationEmails } from "@/lib/services/notification-dispatch"

export type BudgetActionResult = { ok: boolean; message?: string; id?: string }

// Maps the RAISE EXCEPTION messages from submit_event_budget()/decide_budget()
// (0026_phase3_event_budgets.sql) into user-facing Indonesian text. Anything
// unmapped (including a raw RLS denial on the initial insert) falls through
// to a generic message rather than leaking a Postgres-shaped string.
function mapBudgetError(error: { message: string }): string {
  switch (error.message) {
    case "BUDGET_NOT_FOUND":
    case "BUDGET_NOT_FOUND_OR_ALREADY_DECIDED":
      return "Budget tidak ditemukan atau sudah diputuskan"
    case "BUDGET_NOT_DRAFT":
      return "Budget ini bukan draft, tidak bisa diajukan lagi"
    case "BUDGET_HAS_NO_ITEMS":
      return "Budget wajib punya minimal 1 item sebelum diajukan"
    case "CANNOT_APPROVE_OWN_SUBMISSION":
      return "Anda tidak bisa menyetujui budget yang Anda ajukan sendiri"
    case "NO_APPROVAL_TIER_CONFIGURED":
      return "Belum ada konfigurasi tingkat persetujuan untuk nominal ini"
    case "INSUFFICIENT_APPROVAL_TIER":
      return "Role Anda belum cukup untuk menyetujui nominal sebesar ini"
    case "REJECTION_REASON_REQUIRED":
      return "Alasan penolakan wajib diisi"
    case "FORBIDDEN":
      return "Anda tidak berwenang melakukan aksi ini"
    default:
      if (error.message.includes("row-level security policy")) {
        return "Anda tidak berwenang membuat budget untuk event ini"
      }
      return error.message
  }
}

export async function createEventBudget(eventId: string, items: unknown): Promise<BudgetActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = budgetItemsSchema.safeParse(items)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: budget, error: budgetError } = await supabase
    .from("event_budgets")
    // version/status/total_amount are always server-assigned by
    // trg_event_budgets_set_version() regardless of what's inserted here —
    // these are just placeholders to satisfy the generated Insert type.
    .insert({ event_id: eventId, version: 0 })
    .select("id")
    .single()
  if (budgetError) return { ok: false, message: mapBudgetError(budgetError) }

  const { error: itemsError } = await supabase.from("event_budget_items").insert(
    parsed.data.map((item) => ({
      event_budget_id: budget.id,
      cost_category_id: item.cost_category_id,
      planned_amount: item.planned_amount,
    }))
  )
  if (itemsError) {
    // Best-effort cleanup so a failed item insert doesn't leave an empty
    // draft occupying the "one in-flight budget per event" slot.
    await supabase.from("event_budgets").delete().eq("id", budget.id)
    return { ok: false, message: mapBudgetError(itemsError) }
  }

  revalidatePath(`/events/${eventId}`)
  return { ok: true, id: budget.id }
}

export async function deleteEventBudgetDraft(budgetId: string, eventId: string): Promise<BudgetActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.from("event_budgets").delete().eq("id", budgetId)
  if (error) return { ok: false, message: mapBudgetError(error) }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function submitEventBudget(budgetId: string, eventId: string): Promise<BudgetActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.rpc("submit_event_budget", { p_budget_id: budgetId })
  if (error) return { ok: false, message: mapBudgetError(error) }
  await dispatchPendingNotificationEmails()
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function decideEventBudget(
  budgetId: string,
  eventId: string,
  approve: boolean,
  rejectionReason?: string
): Promise<BudgetActionResult> {
  // Stage H/FR-AUTH-08: approving/rejecting a budget is the financial
  // judgment MFA is meant to protect — gated only for a caller who actually
  // holds FINANCE or ADMIN (a no-op for e.g. Operations Manager approvers).
  const ctx = await requireAuth()
  await requireAAL2(ctx)
  const supabase = await createClient()
  const { error } = await supabase.rpc("decide_budget", {
    p_budget_id: budgetId,
    p_approve: approve,
    p_rejection_reason: rejectionReason || undefined,
  })
  if (error) return { ok: false, message: mapBudgetError(error) }
  await dispatchPendingNotificationEmails()
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
