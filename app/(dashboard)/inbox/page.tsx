import { Inbox } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole, type Role } from "@/lib/auth/roles"
import { EmptyState } from "@/components/shared/empty-state"
import { InboxList, type InboxRow } from "./inbox-list"

const PAGE_ROLES: Role[] = ["OPERATIONS_MANAGER", "OPERATIONS", "ADMIN"]
const SEE_VALUE_ROLES: Role[] = ["OPERATIONS_MANAGER", "ADMIN"]
const DECIDE_ROLES: Role[] = ["OPERATIONS_MANAGER", "ADMIN"]

const EVENT_SELECT =
  "id, event_code, event_name, status, is_rush, priority, possible_duplicate, start_date, created_at, sales_value, customers(name), trainings(name), sales:profiles!events_sales_user_id_fkey(full_name), sales_team:teams!events_sales_team_id_fkey(name)"

export default async function InboxPage() {
  const ctx = await requireAuth()
  if (!hasAnyRole(ctx.roles, PAGE_ROLES)) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Inbox}
          title="Halaman ini khusus untuk reviewer"
          description="Antrian review event dibuka untuk Ops Manager dan Admin."
        />
      </div>
    )
  }

  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .is("deleted_at", null)
    .in("status", ["SUBMITTED", "UNDER_REVIEW"])
    .order("created_at", { ascending: true })

  const canSeeSalesValue = hasAnyRole(ctx.roles, SEE_VALUE_ROLES)
  const canDecide = hasAnyRole(ctx.roles, DECIDE_ROLES)

  const isEmpty = !error && (!rows || rows.length === 0)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">Request Inbox</h1>
        <p className="text-sm text-muted-foreground">
          {error ? null : (rows?.length ?? 0) > 0 ? `${rows!.length} event menunggu keputusan Anda` : "Antrian keputusan event"}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Gagal memuat antrian. Silakan coba beberapa saat lagi.</p>
      ) : isEmpty ? (
        <EmptyState
          icon={Inbox}
          title="Tidak ada event menunggu review"
          description="Semua request sudah diputuskan. Request baru dari Sales akan muncul di sini setelah dikirim."
        />
      ) : (
        <InboxList rows={rows as InboxRow[]} canSeeSalesValue={canSeeSalesValue} canDecide={canDecide} />
      )}
    </div>
  )
}