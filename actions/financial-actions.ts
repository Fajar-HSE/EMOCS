"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole, requireAAL2 } from "@/lib/auth/session"
import { costCategorySchema } from "@/lib/validations/cost-category"
import { approvalThresholdSchema } from "@/lib/validations/approval-threshold"

export type FinancialActionResult = { ok: boolean; message?: string; id?: string }

function fromZodError(error: { message: string }): FinancialActionResult {
  return { ok: false, message: error.message }
}

// Shared by every read/write below that touches compute_event_revenue(),
// compute_event_costs(), compute_budget_variance(), apply_financial_closing(),
// or the cost_categories guard trigger (0024/0028/0029_phase3_*.sql).
function mapFinancialError(error: { message: string }): string {
  switch (error.message) {
    case "EVENT_NOT_FOUND":
      return "Event tidak ditemukan"
    case "FORBIDDEN":
      return "Anda tidak berwenang melihat data finansial event ini"
    case "EVENT_NOT_IN_FINANCIAL_CLOSING":
      return "Event ini belum berstatus Financial Closing"
    case "REVENUE_NOT_RECORDED":
      return "Revenue belum tercatat untuk event ini"
    case "PENDING_EXPENSES_EXIST":
      return "Masih ada expense yang belum diputuskan (submitted/under review)"
    case "MANDATORY_DOCUMENTS_NOT_VERIFIED":
      return "Masih ada dokumen wajib yang belum diverifikasi"
    case "NEGATIVE_MARGIN_EXPLANATION_REQUIRED":
      return "Margin negatif — penjelasan tertulis wajib diisi untuk menutup event ini"
    case "COST_CATEGORY_IN_USE":
      return "Kategori biaya ini masih dipakai di budget/expense, tidak bisa dinonaktifkan"
    default:
      return error.message
  }
}

// ---------- Cost category master data (RLS: FINANCE/ADMIN write) ----------

export async function createCostCategory(input: unknown): Promise<FinancialActionResult> {
  const ctx = await requireRole("FINANCE", "ADMIN")
  await requireAAL2(ctx)
  const parsed = costCategorySchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cost_categories")
    .insert({
      company_id: ctx.profile.company_id,
      code: parsed.data.code,
      name: parsed.data.name,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: mapFinancialError(error) }
  revalidatePath("/master/cost-categories")
  return { ok: true, id: data.id }
}

export async function updateCostCategory(id: string, input: unknown): Promise<FinancialActionResult> {
  const ctx = await requireRole("FINANCE", "ADMIN")
  await requireAAL2(ctx)
  const parsed = costCategorySchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("cost_categories")
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .eq("id", id)

  if (error) return { ok: false, message: mapFinancialError(error) }
  revalidatePath("/master/cost-categories")
  return { ok: true }
}

export async function deactivateCostCategory(id: string): Promise<FinancialActionResult> {
  const ctx = await requireRole("FINANCE", "ADMIN")
  await requireAAL2(ctx)
  const supabase = await createClient()
  const { error } = await supabase
    .from("cost_categories")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { ok: false, message: mapFinancialError(error) }
  revalidatePath("/master/cost-categories")
  return { ok: true }
}

// ---------- Approval threshold master data (RLS: FINANCE/ADMIN write) ----------
// §14.7/D10/D11: thresholds are data, not code, so Finance/Admin can retune
// approval routing without a deployment.

export async function createApprovalThreshold(input: unknown): Promise<FinancialActionResult> {
  const ctx = await requireRole("FINANCE", "ADMIN")
  await requireAAL2(ctx)
  const parsed = approvalThresholdSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("approval_thresholds")
    .insert({
      company_id: ctx.profile.company_id,
      context: parsed.data.context,
      approver_role: parsed.data.approver_role,
      min_amount: parsed.data.min_amount,
      max_amount: parsed.data.max_amount ?? null,
      sort_order: parsed.data.sort_order,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: mapFinancialError(error) }
  revalidatePath("/master/approval-thresholds")
  return { ok: true, id: data.id }
}

export async function updateApprovalThreshold(id: string, input: unknown): Promise<FinancialActionResult> {
  const ctx = await requireRole("FINANCE", "ADMIN")
  await requireAAL2(ctx)
  const parsed = approvalThresholdSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("approval_thresholds")
    .update({
      context: parsed.data.context,
      approver_role: parsed.data.approver_role,
      min_amount: parsed.data.min_amount,
      max_amount: parsed.data.max_amount ?? null,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", id)

  if (error) return { ok: false, message: mapFinancialError(error) }
  revalidatePath("/master/approval-thresholds")
  return { ok: true }
}

export async function deactivateApprovalThreshold(id: string): Promise<FinancialActionResult> {
  const ctx = await requireRole("FINANCE", "ADMIN")
  await requireAAL2(ctx)
  const supabase = await createClient()
  const { error } = await supabase.from("approval_thresholds").update({ is_active: false }).eq("id", id)

  if (error) return { ok: false, message: mapFinancialError(error) }
  revalidatePath("/master/approval-thresholds")
  return { ok: true }
}

// ---------- Read-only financial summaries (§14.3/§14.4/§14.5) ----------
// Authorization is enforced inside can_view_event_financials(), called by
// each of these RPCs — requireAuth() here only rules out anonymous access,
// the RPC itself decides whether *this* user may see *this* event's numbers.
// Deliberately NOT gated by requireAAL2(): the Event Detail page calls these
// as part of one larger Server Component render alongside every other tab's
// data, so redirecting here would block the *entire* page (every tab, not
// just Financial) for a FINANCE/ADMIN viewer who hasn't done MFA yet. The
// MFA requirement is enforced at the point of financial *judgment*
// (approve/reject/close/reconfigure below), not at read access.

export type EventCostsSummary = { actual_cost: number; pending_cost: number; projected_cost: number }
export type EventCostsResult = { ok: true; data: EventCostsSummary } | { ok: false; message: string }

export async function getEventCosts(eventId: string): Promise<EventCostsResult> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("compute_event_costs", { p_event_id: eventId })
  if (error) return { ok: false, message: mapFinancialError(error) }
  const row = data?.[0]
  return {
    ok: true,
    data: {
      actual_cost: Number(row?.actual_cost ?? 0),
      pending_cost: Number(row?.pending_cost ?? 0),
      projected_cost: Number(row?.projected_cost ?? 0),
    },
  }
}

export type EventRevenueResult = { ok: true; data: number } | { ok: false; message: string }

export async function getEventRevenue(eventId: string): Promise<EventRevenueResult> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("compute_event_revenue", { p_event_id: eventId })
  if (error) return { ok: false, message: mapFinancialError(error) }
  return { ok: true, data: Number(data ?? 0) }
}

export type BudgetVarianceRow = {
  cost_category_id: string
  cost_category_name: string
  budgeted_amount: number
  actual_amount: number
  variance_amount: number
  variance_pct: number | null
  band: "NO_BUDGET" | "UNDER" | "ON_BUDGET" | "OVER" | "ALERT"
}
export type BudgetVarianceResult = { ok: true; data: BudgetVarianceRow[] } | { ok: false; message: string }

export async function getBudgetVariance(eventId: string): Promise<BudgetVarianceResult> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("compute_budget_variance", { p_event_id: eventId })
  if (error) return { ok: false, message: mapFinancialError(error) }
  return { ok: true, data: (data ?? []) as BudgetVarianceRow[] }
}

// ---------- Sales cost summary (§23.2, BR-FIN-15) ----------
// PRD §23.2 allows Sales to see the *total* actual cost of their OWN event —
// never per-expense detail, never margin. This is a separate slimmed-down
// view (not the Financial tab): owner-only check here PLUS the RPC's own
// can_view_event_financials() check, and only actual_cost leaves this
// function (pending/projected/revenue are deliberately stripped).
export type SalesCostSummaryResult =
  | { ok: true; data: { actual_cost: number } }
  | { ok: false; message: string }

export async function getSalesCostSummary(eventId: string): Promise<SalesCostSummaryResult> {
  const ctx = await requireAuth()
  const supabase = await createClient()
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("sales_user_id")
    .eq("id", eventId)
    .single()
  if (eventError || !event || event.sales_user_id !== ctx.userId) {
    return { ok: false, message: "Anda tidak berwenang melihat ringkasan biaya event ini" }
  }
  const { data, error } = await supabase.rpc("compute_event_costs", { p_event_id: eventId })
  if (error) return { ok: false, message: mapFinancialError(error) }
  return { ok: true, data: { actual_cost: Number(data?.[0]?.actual_cost ?? 0) } }
}

// ---------- Financial closing (§14.6/§14.8) ----------

export type ClosingActionResult = { ok: boolean; message?: string }

export async function applyFinancialClosing(
  eventId: string,
  negativeMarginExplanation?: string
): Promise<ClosingActionResult> {
  const ctx = await requireRole("FINANCE", "ADMIN")
  await requireAAL2(ctx)
  const supabase = await createClient()
  const { error } = await supabase.rpc("apply_financial_closing", {
    p_event_id: eventId,
    p_negative_margin_explanation: negativeMarginExplanation || undefined,
  })
  if (error) return { ok: false, message: mapFinancialError(error) }
  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
  return { ok: true }
}
