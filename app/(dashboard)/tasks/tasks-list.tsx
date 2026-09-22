"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ListChecks, OctagonAlert } from "lucide-react"
import { updateTaskStatus } from "@/actions/task-actions"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { EventStatusBadge } from "@/components/shared/event-status-badge"
import { formatDate } from "@/lib/utils/format"
import { TASK_PRIORITY_LABELS } from "@/lib/validations/labels"
import { cn } from "@/lib/utils"

export type TaskRow = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  is_mandatory: boolean | null
  blocked_reason: string | null
  event_id: string
  assignee: { full_name: string | null } | null
  events: {
    event_code: string | null
    event_name: string
    status: string
    start_date: string | null
    pic_user_id: string | null
    backup_pic_user_id: string | null
    customers: { name: string | null } | null
  } | null
}

type Scope = "mine" | "all"
type StatusFilter = "ALL" | "OPEN" | "DONE" | "OVERDUE" | "BLOCKED"

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
const isOpen = (s: string) => s !== "DONE" && s !== "CANCELLED"
const isOverdue = (r: TaskRow) => !!r.due_date && r.due_date < todayStr() && isOpen(r.status)

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  TODO: "secondary",
  IN_PROGRESS: "default",
  BLOCKED: "destructive",
  DONE: "outline",
  CANCELLED: "outline",
}
const STATUS_LABEL: Record<string, string> = {
  TODO: "Belum dimulai",
  IN_PROGRESS: "Sedang dikerjakan",
  BLOCKED: "Terhambat",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
}

export function TasksList({
  rows,
  allRows,
  currentUserId,
  isOps,
  canViewAll,
}: {
  rows: TaskRow[]
  allRows: TaskRow[]
  currentUserId: string
  isOps: boolean
  canViewAll: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [scope, setScope] = useState<Scope>("mine")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [blockDialog, setBlockDialog] = useState<TaskRow | null>(null)
  const [reason, setReason] = useState("")

  const source = scope === "all" ? allRows : rows
  const filtered = source.filter((r) => {
    switch (statusFilter) {
      case "OPEN":
        return isOpen(r.status)
      case "DONE":
        return r.status === "DONE"
      case "OVERDUE":
        return isOverdue(r)
      case "BLOCKED":
        return r.status === "BLOCKED"
      default:
        return true
    }
  })

  const total = source.length
  const openCount = source.filter((r) => isOpen(r.status)).length
  const overdueCount = source.filter(isOverdue).length
  const blockedCount = source.filter((r) => r.status === "BLOCKED").length

  function setStatus(row: TaskRow, status: "TODO" | "IN_PROGRESS" | "DONE") {
    startTransition(async () => {
      const result = await updateTaskStatus(row.id, row.event_id, status)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal memperbarui status")
        return
      }
      toast.success("Status task diperbarui")
      router.refresh()
    })
  }

  function submitBlock() {
    if (!blockDialog) return
    if (!reason.trim()) {
      toast.error("Alasan blocked wajib diisi")
      return
    }
    startTransition(async () => {
      const result = await updateTaskStatus(blockDialog.id, blockDialog.event_id, "BLOCKED", reason.trim())
      if (!result.ok) {
        toast.error(result.message ?? "Gagal")
        return
      }
      toast.success("Task ditandai terhambat")
      setBlockDialog(null)
      setReason("")
      router.refresh()
    })
  }

  const canWriteAny = canViewAll || isOps

  function canManage(row: TaskRow) {
    if (!canWriteAny) return false
    if (canViewAll) return true
    return (
      row.events?.pic_user_id === currentUserId || row.events?.backup_pic_user_id === currentUserId
    )
  }

  const columns: Column<TaskRow>[] = [
    {
      header: "Task",
      primary: true,
      cell: (r) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("text-sm font-medium", r.status === "DONE" && "text-muted-foreground line-through")}>
              {r.title}
            </span>
            {r.is_mandatory ? (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-rose-600">
                WAJIB
              </Badge>
            ) : null}
            {isOverdue(r) ? (
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                Terlambat
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Link href={`/events/${r.event_id}`} className="font-mono font-medium text-indigo-600 hover:underline">
              {r.events?.event_code ?? "EVT"}
            </Link>
            <span>·</span>
            <span>{r.events?.event_name}</span>
            {r.events?.customers?.name ? (
              <>
                <span>·</span>
                <span>{r.events.customers.name}</span>
              </>
            ) : null}
          </div>
          {r.status === "BLOCKED" && r.blocked_reason ? (
            <p className="text-xs text-destructive">
              <OctagonAlert className="mr-1 inline h-3 w-3" />
              {r.blocked_reason}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      header: "Event Status",
      className: "hidden md:table-cell",
      cell: (r) => (r.events?.status ? <EventStatusBadge status={r.events.status} /> : <span className="text-sm">—</span>),
    },
    {
      header: "Assign",
      className: "hidden lg:table-cell",
      cell: (r) => <span className="text-sm">{r.assignee?.full_name ?? "—"}</span>,
    },
    {
      header: "Jatuh Tempo",
      className: "hidden md:table-cell",
      cell: (r) => (
        <span className={cn("text-sm", isOverdue(r) && "font-medium text-destructive")}>
          {r.due_date ? formatDate(r.due_date, "d MMM yyyy") : "—"}
        </span>
      ),
    },
    {
      header: "Prioritas",
      className: "hidden xl:table-cell",
      cell: (r) => <span className="text-sm">{TASK_PRIORITY_LABELS[r.priority as keyof typeof TASK_PRIORITY_LABELS] ?? r.priority}</span>,
    },
    {
      header: "Status",
      primary: true,
      cell: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Badge>,
    },
    {
      header: "Aksi",
      primary: true,
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="outline" render={<Link href={`/events/${r.event_id}`}>Buka Event</Link>} />
          {canManage(r) ? (
            <>
              {r.status === "TODO" && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(r, "IN_PROGRESS")}>
                  Mulai
                </Button>
              )}
              {r.status === "IN_PROGRESS" && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={pending} onClick={() => setStatus(r, "DONE")}>
                  Selesai
                </Button>
              )}
              {(r.status === "TODO" || r.status === "IN_PROGRESS") && (
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => setBlockDialog(r)}>
                  Blokir
                </Button>
              )}
            </>
          ) : null}
        </div>
      ),
    },
  ]

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: `Semua (${total})` },
    { key: "OPEN", label: `Menunggu (${openCount})` },
    { key: "DONE", label: "Selesai" },
    { key: "OVERDUE", label: `Terlambat (${overdueCount})` },
    { key: "BLOCKED", label: `Terhambat (${blockedCount})` },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Task" value={total} />
        <StatCard label="Menunggu" value={openCount} />
        <StatCard label="Terlambat" value={overdueCount} tone="danger" />
        <StatCard label="Terhambat" value={blockedCount} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canViewAll ? (
          <div className="flex overflow-hidden rounded-md border">
            {(["mine", "all"] as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition",
                  scope === s ? "bg-slate-900 text-white" : "bg-white text-muted-foreground hover:bg-slate-50",
                )}
              >
                {s === "mine" ? "Task Saya" : "Semua Task"}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                statusFilter === t.key
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-muted-foreground hover:bg-slate-50",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <ListChecks className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Tidak ada task</p>
            <p className="text-sm text-muted-foreground">
              {scope === "mine"
                ? "Belum ada task untuk Anda. Task akan dibuat saat event masuk tahap persiapan."
                : "Belum ada task di event yang Anda lihat."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable rows={filtered} columns={columns} rowKey={(r) => r.id} />
      )}

      <Dialog open={!!blockDialog} onOpenChange={(o) => !o && setBlockDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blokir Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{blockDialog?.title}</span> — alasan ini membantu PIC dan Ops Manager
              memahami hambatannya.
            </p>
            <Textarea
              autoFocus
              rows={3}
              placeholder="Alasan terhambat..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={submitBlock}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-semibold", tone === "danger" ? "text-destructive" : "")}>{value}</p>
      </CardContent>
    </Card>
  )
}