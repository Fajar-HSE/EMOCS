"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CircleCheck, CircleX, PencilLine, TriangleAlert } from "lucide-react"
import { reviewEvent } from "@/actions/event-actions"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { EventStatusBadge } from "@/components/shared/event-status-badge"
import { formatDate, formatIDR } from "@/lib/utils/format"

export type InboxRow = {
  id: string
  event_code: string | null
  event_name: string
  status: string
  is_rush: boolean | null
  priority: string
  possible_duplicate: boolean | null
  start_date: string | null
  created_at: string
  sales_value: number | null
  customers: { name: string | null } | null
  trainings: { name: string | null } | null
  sales: { full_name: string | null } | null
  sales_team: { name: string | null } | null
}

type Decision = "APPROVE" | "REJECT" | "REVISION"

export function InboxList({
  rows,
  canSeeSalesValue,
  canDecide,
}: {
  rows: InboxRow[]
  canSeeSalesValue: boolean
  canDecide: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [decideDialog, setDecideDialog] = useState<{ row: InboxRow; decision: Decision } | null>(null)
  const [note, setNote] = useState("")

  const openDialog = (row: InboxRow, decision: Decision) => {
    setNote("")
    setDecideDialog({ row, decision })
  }

  function submitDecision() {
    if (!decideDialog) return
    const { row, decision } = decideDialog
    if (decision !== "APPROVE" && !note.trim()) {
      toast.error(decision === "REJECT" ? "Alasan penolakan wajib diisi" : "Catatan revisi wajib diisi")
      return
    }
    startTransition(async () => {
      const result = await reviewEvent(row.id, decision, note.trim() || undefined)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal memproses review")
        return
      }
      toast.success(
        decision === "APPROVE" ? "Event disetujui" : decision === "REJECT" ? "Event ditolak" : "Revisi diminta",
      )
      setDecideDialog(null)
      router.refresh()
    })
  }

  const dialogTitle =
    decideDialog?.decision === "APPROVE"
      ? "Setujui Event"
      : decideDialog?.decision === "REJECT"
        ? "Tolak Event"
        : "Minta Revisi"

  const columns: Column<InboxRow>[] = [
    {
      header: "Event",
      primary: true,
      cell: (r) => (
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/events/${r.id}`}
              className="font-mono text-sm font-semibold text-indigo-600 hover:underline"
            >
              {r.event_code ?? "DRAFT"}
            </Link>
            {r.is_rush ? (
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                RUSH
              </Badge>
            ) : null}
            {r.possible_duplicate ? (
              <span title="Kemungkinan duplikat dengan event lain (customer + program + tanggal sama)">
                <TriangleAlert className="h-4 w-4 text-amber-500" />
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{r.event_name}</p>
        </div>
      ),
    },
    {
      header: "Customer",
      className: "hidden md:table-cell",
      cell: (r) => <span className="text-sm">{r.customers?.name ?? "—"}</span>,
    },
    {
      header: "Program",
      className: "hidden lg:table-cell",
      cell: (r) => <span className="text-sm">{r.trainings?.name ?? "—"}</span>,
    },
    {
      header: "Sales",
      className: "hidden lg:table-cell",
      cell: (r) => (
        <span className="text-sm">
          {r.sales?.full_name ?? "—"}
          {r.sales_team?.name ? (
            <span className="ml-1 text-xs text-muted-foreground">({r.sales_team.name})</span>
          ) : null}
        </span>
      ),
    },
    {
      header: "Mulai",
      className: "hidden md:table-cell",
      cell: (r) => <span className="text-sm">{r.start_date ? formatDate(r.start_date, "d MMM yyyy") : "—"}</span>,
    },
    ...(canSeeSalesValue
      ? [
          {
            header: "Nilai Jual",
            className: "hidden xl:table-cell",
            cell: (r: InboxRow) => (
              <span className="text-sm font-medium">{r.sales_value != null ? formatIDR(r.sales_value) : "—"}</span>
            ),
          } as Column<InboxRow>,
        ]
      : []),
    {
      header: "Status",
      className: "hidden md:table-cell",
      cell: (r) => <EventStatusBadge status={r.status} />,
    },
    {
      header: "Aksi",
      primary: true,
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="outline" render={<Link href={`/events/${r.id}`}>Detail</Link>} />
          {canDecide ? (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => openDialog(r, "APPROVE")}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CircleCheck className="h-4 w-4" />
                Setujui
              </Button>
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => openDialog(r, "REJECT")}>
                <CircleX className="h-4 w-4" />
                Tolak
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => openDialog(r, "REVISION")}>
                <PencilLine className="h-4 w-4" />
                Revisi
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />

      <Dialog open={!!decideDialog} onOpenChange={(o) => !o && setDecideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-mono font-semibold">{decideDialog?.row.event_code}</span> —{" "}
              {decideDialog?.row.event_name}
            </p>
            {decideDialog?.decision === "REJECT" ? (
              <p className="text-muted-foreground">Alasan penolakan ini akan terlihat oleh Sales.</p>
            ) : (
              <p className="text-muted-foreground">Catatan revisi ini akan terlihat oleh Sales.</p>
            )}
            {decideDialog?.decision !== "APPROVE" && (
              <Textarea
                autoFocus
                rows={3}
                placeholder={decideDialog?.decision === "REJECT" ? "Alasan penolakan..." : "Catatan revisi..."}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={submitDecision}>
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}