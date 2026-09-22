import Link from "next/link"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole, hasRole, type Role } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/server"
import { signOut } from "@/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/shared/notification-bell"
import { AppSidebar, ROLE_LABELS, type SidebarCounts } from "@/components/shared/app-sidebar"

const ROLE_PRIORITY: Role[] = [
  "ADMIN",
  "MANAGEMENT",
  "OPERATIONS_MANAGER",
  "FINANCE",
  "SALES_MANAGER",
  "SALES",
  "OPERATIONS",
]

const INBOX_ROLES = ["OPERATIONS_MANAGER", "OPERATIONS", "ADMIN"] as Role[]
const TASKS_ROLES = ["OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"] as Role[]
const FINANCIAL_ROLES = ["FINANCE", "MANAGEMENT", "ADMIN", "OPERATIONS_MANAGER"] as Role[]

async function getSidebarCounts(ctx: {
  userId: string
  roles: string[]
}): Promise<SidebarCounts> {
  const supabase = await createClient()
  const counts: SidebarCounts = {}

  const [canInbox, canTasks, canFinancials] = [
    hasAnyRole(ctx.roles, INBOX_ROLES),
    hasAnyRole(ctx.roles, TASKS_ROLES),
    hasAnyRole(ctx.roles, FINANCIAL_ROLES),
  ]

  if (canInbox) {
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .in("status", ["SUBMITTED", "UNDER_REVIEW"])
    counts.inbox = count ?? 0
  }

  if (canTasks) {
    if (hasRole(ctx.roles, "OPERATIONS")) {
      const { data: myEvents } = await supabase
        .from("events")
        .select("id")
        .is("deleted_at", null)
        .or(`pic_user_id.eq.${ctx.userId},backup_pic_user_id.eq.${ctx.userId}`)
      const ids = (myEvents ?? []).map((e) => e.id)
      if (ids.length > 0) {
        const { count } = await supabase
          .from("event_tasks")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .not("status", "in", "(DONE,CANCELLED)")
          .or(`assignee_user_id.eq.${ctx.userId},event_id.in.(${ids.join(",")})`)
        counts.tasks = count ?? 0
      } else {
        counts.tasks = 0
      }
    } else {
      const { count } = await supabase
        .from("event_tasks")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .not("status", "in", "(DONE,CANCELLED)")
        .eq("assignee_user_id", ctx.userId)
      counts.tasks = count ?? 0
    }
  }

  if (canFinancials) {
    const { count } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .in("status", ["SUBMITTED", "UNDER_REVIEW"])
    counts.financials = count ?? 0
  }

  return counts
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth()
  const counts = await getSidebarCounts(ctx)

  const primaryRole = ROLE_PRIORITY.find((r) => ctx.roles.includes(r)) ?? ctx.roles[0]
  const initials = (ctx.profile?.full_name ?? ctx.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="flex min-h-svh bg-[#f4f6fa]">
      <AppSidebar roles={ctx.roles} counts={counts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 py-3.5 sm:px-8">
          <form action="/events" method="get" className="w-full max-w-xl">
            <input
              name="q"
              className="w-full rounded-lg border border-slate-200/90 bg-slate-50 px-4 py-2 text-sm text-slate-700 placeholder-slate-400 transition focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Cari Event Code (EVT-...), nama event, customer..."
            />
          </form>
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Notifikasi dimuat di client setelah halaman render — menghindari DB query tambahan saat login */}
            <NotificationBell userId={ctx.userId} initialNotifications={[]} />
            <Link href="/account/security" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-600 text-xs font-semibold text-white">
                {initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-semibold text-slate-800">
                  {ctx.profile?.full_name ?? ctx.email}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {primaryRole ? (ROLE_LABELS[primaryRole] ?? primaryRole) : ""}
                </span>
              </span>
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </header>
        <nav className="flex gap-4 overflow-x-auto border-b bg-white px-4 py-2 text-sm lg:hidden">
          <Link href="/dashboard" className="text-muted-foreground whitespace-nowrap">
            Dashboard
          </Link>
          {hasAnyRole(ctx.roles, INBOX_ROLES) && (
            <Link href="/inbox" className="text-muted-foreground whitespace-nowrap">
              Inbox
            </Link>
          )}
          <Link href="/events" className="text-muted-foreground whitespace-nowrap">
            Daftar Event
          </Link>
          {hasAnyRole(ctx.roles, TASKS_ROLES) && (
            <Link href="/tasks" className="text-muted-foreground whitespace-nowrap">
              Task
            </Link>
          )}
          {hasAnyRole(ctx.roles, FINANCIAL_ROLES) && (
            <Link href="/financials" className="text-muted-foreground whitespace-nowrap">
              Finance
            </Link>
          )}
          {hasAnyRole(ctx.roles, ["ADMIN", "MANAGEMENT", "OPERATIONS_MANAGER"]) && (
            <Link href="/audit-log" className="text-muted-foreground whitespace-nowrap">
              Audit Log
            </Link>
          )}
          {hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "FINANCE", "ADMIN", "MANAGEMENT"]) && (
            <Link href="/master" className="text-muted-foreground whitespace-nowrap">
              Master Data
            </Link>
          )}
          {!hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "FINANCE", "ADMIN", "MANAGEMENT"]) && (
            <Link href="/master/customers" className="text-muted-foreground whitespace-nowrap">
              Customers
            </Link>
          )}
          {hasAnyRole(ctx.roles, ["ADMIN"]) && (
            <Link href="/admin" className="text-muted-foreground whitespace-nowrap">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}