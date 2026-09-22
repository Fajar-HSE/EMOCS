import { ListChecks } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole, type Role } from "@/lib/auth/roles"
import { EmptyState } from "@/components/shared/empty-state"
import { TasksList, type TaskRow } from "./tasks-list"

const PAGE_ROLES: Role[] = ["OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"]

const TASK_SELECT =
  "id, title, status, priority, due_date, is_mandatory, blocked_reason, event_id, assignee:profiles!event_tasks_assignee_user_id_fkey(full_name), events(event_code, event_name, status, start_date, pic_user_id, backup_pic_user_id, customers(name))"

export default async function TasksPage() {
  const ctx = await requireAuth()
  if (!hasAnyRole(ctx.roles, PAGE_ROLES)) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ListChecks}
          title="Halaman ini khusus untuk tim Operasional"
          description="Task Anda akan muncul di sini setelah event masuk tahap persiapan."
        />
      </div>
    )
  }

  const supabase = await createClient()
  const isOps = hasAnyRole(ctx.roles, ["OPERATIONS"])
  const canViewAll = hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"])

  const { data: myEvents } = await supabase
    .from("events")
    .select("id")
    .is("deleted_at", null)
    .or(`pic_user_id.eq.${ctx.userId},backup_pic_user_id.eq.${ctx.userId}`)
  const myEventIds = (myEvents ?? []).map((e) => e.id)

  const baseQuery = supabase
    .from("event_tasks")
    .select(TASK_SELECT)
    .is("deleted_at", null)

  const [mineResult, allResult] = await Promise.all([
    myEventIds.length > 0
      ? baseQuery
          .or(`assignee_user_id.eq.${ctx.userId},event_id.in.(${myEventIds.join(",")})`)
          .order("due_date", { ascending: true, nullsFirst: false })
      : baseQuery.eq("assignee_user_id", ctx.userId).order("due_date", { ascending: true, nullsFirst: false }),
    canViewAll ? baseQuery.order("due_date", { ascending: true, nullsFirst: false }) : null,
  ])

  const mineRows = mineResult.data ?? []
  const allRows = allResult?.data ?? []

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">Task & Checklist</h1>
        <p className="text-sm text-muted-foreground">
          {mineRows.length > 0 ? `${mineRows.length} task untuk Anda` : "Semua task yang ditugaskan kepada Anda"}
        </p>
      </div>

      <TasksList
        rows={mineRows as TaskRow[]}
        allRows={allRows as TaskRow[]}
        currentUserId={ctx.userId}
        isOps={isOps}
        canViewAll={canViewAll}
      />
    </div>
  )
}