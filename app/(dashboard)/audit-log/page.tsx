import { ScrollText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole, type Role } from "@/lib/auth/roles"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { AuditFilter } from "./audit-filter"
import { AuditLogList, type AuditRow } from "./audit-log-list"
import { AUDIT_TABLES } from "./audit-tables"

const PAGE_ROLES: Role[] = ["ADMIN", "MANAGEMENT", "OPERATIONS_MANAGER"]
const PAGE_SIZE = 25

const SELECT =
  "id, table_name, action, actor_email, actor_user_id, record_id, changed_fields, old_values, new_values, created_at"

function buildHref(filters: { table?: string; q?: string; page?: number }, page: number) {
  const params = new URLSearchParams()
  if (filters.table) params.set("table", filters.table)
  if (filters.q) params.set("q", filters.q)
  if (page > 1) params.set("page", String(page))
  const qs = params.toString()
  return qs ? `/audit-log?${qs}` : "/audit-log"
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; q?: string; page?: string }>
}) {
  const ctx = await requireAuth()
  const { table, q, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  if (!hasAnyRole(ctx.roles, PAGE_ROLES)) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ScrollText}
          title="Halaman ini khusus untuk Admin dan Management"
          description="Audit log hanya bisa dibuka oleh Admin, Management, dan Ops Manager."
        />
      </div>
    )
  }

  const supabase = await createClient()
  const onlyOpsScope = !hasAnyRole(ctx.roles, ["ADMIN", "MANAGEMENT"])

  let query = supabase
    .from("audit_logs")
    .select(SELECT, { count: "exact" })
    .eq("company_id", ctx.profile?.company_id ?? "")
    .order("created_at", { ascending: false })

  if (onlyOpsScope) {
    query = query.in("table_name", ["events", "event_tasks"])
  }
  if (table && table !== "ALL") {
    query = query.eq("table_name", table)
  }
  if (q) {
    query = query.or(`actor_email.ilike.%${q}%,action.ilike.%${q}%`)
  }

  const from = (page - 1) * PAGE_SIZE
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const rows = (data ?? []) as AuditRow[]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">Audit Log & Security</h1>
        <p className="text-sm text-muted-foreground">
{onlyOpsScope
        ? "Perubahan pada event dan task (ruang lingkup Ops Manager)"
        : "Jejak perubahan data seluruh sistem"}
      </p>
    </div>

    <AuditFilter tableOptions={[...AUDIT_TABLES].filter((t) => (
      !onlyOpsScope || t.key === "events" || t.key === "event_tasks"
    ))} />

      {error ? (
        <p className="text-sm text-destructive">Gagal memuat audit log. Silakan coba beberapa saat lagi.</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Tidak ada catatan audit"
          description="Belum ada perubahan yang tercatat sesuai filter yang dipilih."
        />
      ) : (
        <>
          <AuditLogList rows={rows} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {count ?? 0} catatan · Halaman {currentPage} dari {totalPages}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={buildHref({ table, q }, currentPage - 1)}>Sebelumnya</Link>}
                />
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Sebelumnya
                </Button>
              )}
              {currentPage < totalPages ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={buildHref({ table, q }, currentPage + 1)}>Berikutnya</Link>}
                />
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Berikutnya
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}