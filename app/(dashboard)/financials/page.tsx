import { Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole, type Role } from "@/lib/auth/roles"
import { getEventCosts, getEventRevenue } from "@/actions/financial-actions"
import { EmptyState } from "@/components/shared/empty-state"
import { FinancialsList, type ExpenseRow, type ClosingEventRow } from "./financials-list"

const PAGE_ROLES: Role[] = ["FINANCE", "MANAGEMENT", "ADMIN", "OPERATIONS_MANAGER"]
const DECIDE_ROLES: Role[] = ["OPERATIONS_MANAGER", "FINANCE", "MANAGEMENT", "ADMIN"]
const CLOSE_ROLES: Role[] = ["FINANCE", "ADMIN"]

export default async function FinancialsPage() {
  const ctx = await requireAuth()
  if (!hasAnyRole(ctx.roles, PAGE_ROLES)) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Wallet}
          title="Halaman ini khusus untuk keuangan"
          description="Persetujuan expense dan financial closing dikelola oleh Finance dan Ops Manager."
        />
      </div>
    )
  }

  const supabase = await createClient()

  const { data: pendingExpenses } = await supabase
    .from("expenses")
    .select(
      "id, description, amount, status, required_approver_role, submitted_at, submitted_by, event_id, cost_categories(name), submitted_by_profile:profiles!expenses_submitted_by_fkey(full_name), events(event_code, event_name, status)"
    )
    .in("status", ["SUBMITTED", "UNDER_REVIEW"])
    .order("submitted_at", { ascending: true })

  const { data: closingEvents } = await supabase
    .from("events")
    .select("id, event_code, event_name, start_date, customers(name)")
    .is("deleted_at", null)
    .eq("status", "FINANCIAL_CLOSING")
    .order("start_date", { ascending: true })

  const closingWithSnapshot: ClosingEventRow[] = []
  for (const ev of closingEvents ?? []) {
    const [costs, revenue] = await Promise.allSettled([
      getEventCosts(ev.id),
      getEventRevenue(ev.id),
    ])
    const pendingCount = (pendingExpenses ?? []).filter((e) => e.event_id === ev.id).length
    closingWithSnapshot.push({
      id: ev.id,
      event_code: ev.event_code,
      event_name: ev.event_name,
      start_date: ev.start_date,
      customer_name: ev.customers?.name ?? null,
      pending_expense_count: pendingCount,
      actual_cost:
        costs.status === "fulfilled" && costs.value.ok ? costs.value.data.actual_cost : null,
      revenue: revenue.status === "fulfilled" && revenue.value.ok ? revenue.value.data : null,
    })
  }

  const expenseRows = (pendingExpenses ?? []) as ExpenseRow[]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">Finance & Closing</h1>
        <p className="text-sm text-muted-foreground">Persetujuan expense dan penutupan finansial event</p>
      </div>

      <FinancialsList
        rows={expenseRows}
        closingEvents={closingWithSnapshot}
        canDecide={hasAnyRole(ctx.roles, DECIDE_ROLES)}
        canClose={hasAnyRole(ctx.roles, CLOSE_ROLES)}
      />
    </div>
  )
}