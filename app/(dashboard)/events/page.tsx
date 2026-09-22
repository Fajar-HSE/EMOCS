import Link from "next/link"
import { CalendarX2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole, type Role } from "@/lib/auth/roles"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { EventsFilter } from "./events-filter"
import { EventsList } from "./events-list"
import { ACTIVE_STATUSES, type EventStatus } from "./status-options"

const PAGE_SIZE = 25

const EVENT_SELECT =
  "id, event_code, event_name, status, progress_percentage, start_date, end_date, is_rush, sales_value, sales_user_id, customer_id, contact_id, training_id, event_type, delivery_mode, start_time, end_time, location_type, location_name, city_id, participant_count, description, special_requirements, po_status, po_number, payment_term, customer_reference, priority, sales_team_id, customers(name), trainings(name), cities(name), pic:profiles!events_pic_user_id_fkey(full_name), sales:profiles!events_sales_user_id_fkey(full_name), sales_team:teams!events_sales_team_id_fkey(name)"

const MINE_ROLES: Role[] = ["SALES", "SALES_MANAGER", "OPERATIONS", "OPERATIONS_MANAGER"]
const SEE_ALL_VALUE_ROLES: Role[] = ["SALES_MANAGER", "OPERATIONS_MANAGER", "MANAGEMENT", "FINANCE", "ADMIN"]
const EDIT_EVENT_ROLES: Role[] = ["ADMIN", "SALES_MANAGER", "OPERATIONS_MANAGER"]
const MANAGER_OR_ADMIN_ROLES: Role[] = ["ADMIN", "OPERATIONS_MANAGER"]

function buildHref(filters: { q?: string; status?: string; mine?: string; page?: number }, page: number) {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.status) params.set("status", filters.status)
  if (filters.mine) params.set("mine", filters.mine)
  if (page > 1) params.set("page", String(page))
  const qs = params.toString()
  return qs ? `/events?${qs}` : "/events"
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; mine?: string; page?: string }>
}) {
  const ctx = await requireAuth()
  const { q, status, mine, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const onlyMine = mine === "1"
  const supabase = await createClient()

  let query = supabase
    .from("events")
    .select(EVENT_SELECT, { count: "exact" })
    .is("deleted_at", null)
    .neq("status", "DRAFT")
    .order("created_at", { ascending: false })

  if (status && status !== "ALL") {
    query = query.eq("status", status as EventStatus)
  } else if (!status) {
    query = query.in("status", ACTIVE_STATUSES)
  }

  if (q) {
    query = query.ilike("event_name", `%${q}%`)
  }

  // "My Events": Sales = milik saya; Operations = PIC/backup saya.
  if (onlyMine) {
    if (hasAnyRole(ctx.roles, ["SALES", "SALES_MANAGER"])) {
      query = query.eq("sales_user_id", ctx.userId)
    } else if (hasAnyRole(ctx.roles, ["OPERATIONS", "OPERATIONS_MANAGER"])) {
      query = query.or(`pic_user_id.eq.${ctx.userId},backup_pic_user_id.eq.${ctx.userId}`)
    }
  }

  const from = (page - 1) * PAGE_SIZE
  const { data: events, error, count } = await query.range(from, from + PAGE_SIZE - 1)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const canSeeAllSalesValue = hasAnyRole(ctx.roles, SEE_ALL_VALUE_ROLES)
  const canFilterMine = hasAnyRole(ctx.roles, MINE_ROLES)
  const canEditEvents = hasAnyRole(ctx.roles, EDIT_EVENT_ROLES)
  const isManagerOrAdmin = hasAnyRole(ctx.roles, MANAGER_OR_ADMIN_ROLES)
  const userTeamId = ctx.profile?.team_id ?? null

  const hasEvents = !error && events && events.length > 0

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">{onlyMine ? "Event Saya" : "Event"}</h1>
          {count != null && !error ? (
            <p className="text-sm text-muted-foreground">{count} event</p>
          ) : null}
        </div>
        <Button render={<Link href="/events/new">+ Event Request</Link>} />
      </div>

      <EventsFilter canFilterMine={canFilterMine} />

      {error ? (
        <ErrorState title="Daftar event gagal dimuat" message={error.message} />
      ) : !hasEvents ? (
        <EmptyState
          icon={CalendarX2}
          title="Tidak ada event sesuai filter"
          description="Ubah kata kunci atau filter untuk melihat event lain."
          action={
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/events">Reset filter</Link>}
            />
          }
        />
      ) : (
        <>
          <EventsList
            rows={events}
            currentUserId={ctx.userId}
            canSeeAllSalesValue={canSeeAllSalesValue}
            canEditEvents={canEditEvents}
            isManagerOrAdmin={isManagerOrAdmin}
            userTeamId={userTeamId}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {count ?? 0} event · Halaman {currentPage} dari {totalPages}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={buildHref({ q, status, mine }, currentPage - 1)}>Sebelumnya</Link>}
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
                  render={<Link href={buildHref({ q, status, mine }, currentPage + 1)}>Berikutnya</Link>}
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