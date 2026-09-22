"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole, requireAAL2 } from "@/lib/auth/session"
import { expenseSchema } from "@/lib/validations/expense"
import { dispatchPendingNotificationEmails } from "@/lib/services/notification-dispatch"

export type ExpenseActionResult = { ok: boolean; message?: string; id?: string }

// Maps the RAISE EXCEPTION messages from the expense workflow functions and
// guard triggers (0027_phase3_expenses.sql) into user-facing Indonesian text.
function mapExpenseError(error: { message: string }): string {
  if (error.message.startsWith("CANNOT_ADD_EXPENSE_TO_") || error.message.startsWith("CANNOT_SUBMIT_EXPENSE_TO_")) {
    return "Event ini sudah ditutup/dibatalkan, tidak bisa menambah atau mengajukan expense"
  }
  switch (error.message) {
    case "EXPENSE_NOT_FOUND":
    case "EXPENSE_NOT_FOUND_OR_ALREADY_DECIDED":
      return "Expense tidak ditemukan atau sudah diputuskan"
    case "EXPENSE_NOT_DRAFT":
      return "Expense ini bukan draft, tidak bisa diajukan lagi"
    case "EXPENSE_NOT_FOUND_OR_NOT_SUBMITTED":
      return "Expense tidak ditemukan atau belum diajukan"
    case "EXPENSE_NOT_FOUND_OR_NOT_APPROVED":
      return "Expense tidak ditemukan atau belum disetujui"
    case "JUSTIFICATION_REQUIRED_OUT_OF_BUDGET":
      return "Kategori ini di luar budget yang disetujui — justifikasi wajib diisi"
    case "RECEIPT_REQUIRED_ABOVE_THRESHOLD":
      return "Nominal ini wajib melampirkan bukti/kuitansi"
    case "NO_APPROVAL_TIER_CONFIGURED":
      return "Belum ada konfigurasi tingkat persetujuan untuk nominal ini"
    case "CANNOT_APPROVE_OWN_SUBMISSION":
      return "Anda tidak bisa menyetujui expense yang Anda ajukan sendiri"
    case "INSUFFICIENT_APPROVAL_TIER":
      return "Role Anda belum cukup untuk menyetujui nominal sebesar ini"
    case "REJECTION_REASON_REQUIRED":
      return "Alasan penolakan wajib diisi"
    case "FORBIDDEN":
      return "Anda tidak berwenang melakukan aksi ini"
    default:
      if (error.message.includes("row-level security policy")) {
        return "Anda tidak berwenang mengelola expense untuk event ini"
      }
      return error.message
  }
}

export async function createExpense(eventId: string, input: unknown): Promise<ExpenseActionResult> {
  const ctx = await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "ADMIN")
  const parsed = expenseSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      event_id: eventId,
      cost_category_id: parsed.data.cost_category_id,
      vendor_id: parsed.data.vendor_id || null,
      vendor_name: parsed.data.vendor_name || null,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expense_date: parsed.data.expense_date,
      payment_method: parsed.data.payment_method,
      receipt_document_id: parsed.data.receipt_document_id || null,
      justification_note: parsed.data.justification_note || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: mapExpenseError(error) }
  revalidatePath(`/events/${eventId}`)
  return { ok: true, id: data.id }
}

export async function updateExpense(expenseId: string, eventId: string, input: unknown): Promise<ExpenseActionResult> {
  await requireAuth()
  const parsed = expenseSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from("expenses")
    .update({
      cost_category_id: parsed.data.cost_category_id,
      vendor_id: parsed.data.vendor_id || null,
      vendor_name: parsed.data.vendor_name || null,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expense_date: parsed.data.expense_date,
      payment_method: parsed.data.payment_method,
      receipt_document_id: parsed.data.receipt_document_id || null,
      justification_note: parsed.data.justification_note || null,
    })
    .eq("id", expenseId)

  if (error) return { ok: false, message: mapExpenseError(error) }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function attachExpenseReceipt(
  expenseId: string,
  eventId: string,
  receiptDocumentId: string
): Promise<ExpenseActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase
    .from("expenses")
    .update({ receipt_document_id: receiptDocumentId })
    .eq("id", expenseId)

  if (error) return { ok: false, message: mapExpenseError(error) }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function deleteExpenseDraft(expenseId: string, eventId: string): Promise<ExpenseActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId)
  if (error) return { ok: false, message: mapExpenseError(error) }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function submitExpense(expenseId: string, eventId: string): Promise<ExpenseActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.rpc("submit_expense", { p_expense_id: expenseId })
  if (error) return { ok: false, message: mapExpenseError(error) }
  await dispatchPendingNotificationEmails()
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function markExpenseUnderReview(expenseId: string, eventId: string): Promise<ExpenseActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.rpc("mark_expense_under_review", { p_expense_id: expenseId })
  if (error) return { ok: false, message: mapExpenseError(error) }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function decideExpense(
  expenseId: string,
  eventId: string,
  approve: boolean,
  rejectionReason?: string
): Promise<ExpenseActionResult> {
  // Stage H/FR-AUTH-08: same reasoning as decideEventBudget — MFA guards the
  // approval judgment itself, not expense creation/submission.
  const ctx = await requireAuth()
  await requireAAL2(ctx)
  const supabase = await createClient()
  const { error } = await supabase.rpc("decide_expense", {
    p_expense_id: expenseId,
    p_approve: approve,
    p_rejection_reason: rejectionReason || undefined,
  })
  if (error) return { ok: false, message: mapExpenseError(error) }
  await dispatchPendingNotificationEmails()
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function markExpensePaid(expenseId: string, eventId: string): Promise<ExpenseActionResult> {
  const ctx = await requireRole("FINANCE", "ADMIN")
  await requireAAL2(ctx)
  const supabase = await createClient()
  const { error } = await supabase.rpc("mark_expense_paid", { p_expense_id: expenseId })
  if (error) return { ok: false, message: mapExpenseError(error) }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
