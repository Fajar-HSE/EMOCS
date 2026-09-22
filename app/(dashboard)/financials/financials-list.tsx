"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CircleCheck, CircleX, Wallet, WalletCards } from "lucide-react"
import { decideExpense } from "@/actions/expense-actions"
import { applyFinancialClosing } from "@/actions/financial-actions"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatDate, formatIDR } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

export type ExpenseRow = {
  id: string
  description: string
  amount: number
  status: string
  required_approver_role: string | null
  submitted_at: string | null
  event_id: string
  cost_categories: { name: string | null } | null
  submitted_by_profile: { full_name: string | null } | null
  events: { event_code: string | null; event_name: string; status: string } | null
}

export type ClosingEventRow = {
  id: string
  event_code: string | null
  event_name: string
  start_date: string | null
  customer_name: string | null
  pending_expense_count: number
  actual_cost: number | null
  revenue: number | null
}

const TIER_LABEL: Record<string, string> = {
  OPERATIONS: "Ops PIC",
  OPERATIONS_MANAGER: "Ops Manager",
  FINANCE: "Finance",
  MANAGEMENT: "Management",
  ADMIN: "Admin",
}

const EXPENSE_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Diajukan",
  UNDER_REVIEW: "Ditinjau",
}

function marginOf(revenue: number | null, actual: number | null) {
  if (revenue == null || actual == null) return null
  if (revenue <= 0) return null
  const gp = revenue - actual
  return { gp, pct: (gp / revenue) * 100 }
}

export function FinancialsList({
  rows,
  closingEvents,
  canDecide,
  canClose,
}: {
  rows: ExpenseRow[]
  closingEvents: ClosingEventRow[]
  canDecide: boolean
  canClose: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [decideDialog, setDecideDialog] = useState<{
    row: ExpenseRow
    approve: boolean
  } | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [closeDialog, setCloseDialog] = useState<ClosingEventRow | null>(null)
  const [explanation, setExplanation] = useState("")

  const totalPendingAmount = rows.reduce((acc, r) => acc + r.amount, 0)

  function submitDecision() {
    if (!decideDialog) return
    const { row, approve } = decideDialog
    if (!approve && !rejectionReason.trim()) {
      toast.error("Alasan penolakan wajib diisi")
      return
    }
    startTransition(async () => {
      const result = await decideExpense(row.id, row.event_id, approve, rejectionReason.trim() || undefined)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal memproses keputusan")
        return
      }
      toast.success(approve ? "Expense disetujui" : "Expense ditolak")
      setDecideDialog(null)
      setRejectionReason("")
      router.refresh()
    })
  }

  function submitClose() {
    if (!closeDialog) return
    startTransition(async () => {
      const result = await applyFinancialClosing(closeDialog.id, explanation.trim() || undefined)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menutup event")
        return
      }
      toast.success("Financial closing berhasil")
      setCloseDialog(null)
      setExplanation("")
      router.refresh()
    })
  }

  const columns: Column<ExpenseRow>[] = [
    {
      header: "Event",
      primary: true,
      cell: (r) => (
        <div className="space-y-0.5">
          <Link href={`/events/${r.event_id}`} className="font-mono text-sm font-semibold text-indigo-600 hover:underline">
            {r.events?.event_code ?? "EVT"}
          </Link>
          <p className="text-sm text-muted-foreground">{r.events?.event_name}</p>
        </div>
      ),
    },
    {
      header: "Expense",
      primary: true,
      cell: (r) => (
        <div>
          <p className="text-sm font-medium">{r.description}</p>
          <p className="text-xs text-muted-foreground">{r.cost_categories?.name ?? "—"}</p>
        </div>
      ),
    },
    {
      header: "Nilai",
      className: "hidden md:table-cell",
      cell: (r) => <span className="text-sm font-medium">{formatIDR(r.amount)}</span>,
    },
    {
      header: "Tier",
      className: "hidden lg:table-cell",
      cell: (r) =>
        r.required_approver_role ? (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
            {TIER_LABEL[r.required_approver_role] ?? r.required_approver_role}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      header: "Pengaju",
      className: "hidden xl:table-cell",
      cell: (r) => <span className="text-sm">{r.submitted_by_profile?.full_name ?? "—"}</span>,
    },
    {
      header: "Status",
      className: "hidden md:table-cell",
      cell: (r) => <Badge variant="outline">{EXPENSE_STATUS_LABEL[r.status] ?? r.status}</Badge>,
    },
    {
      header: "Aksi",
      primary: true,
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="outline" render={<Link href={`/events/${r.event_id}?tab=financial`}>Detail</Link>} />
          {canDecide ? (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={pending}
                onClick={() => setDecideDialog({ row: r, approve: true })}
              >
                <CircleCheck className="h-4 w-4" />
                Setujui
              </Button>
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => setDecideDialog({ row: r, approve: false })}>
                <CircleX className="h-4 w-4" />
                Tolak
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Expense Menunggu Keputusan"
          value={rows.length}
          icon={<Wallet className="h-5 w-5 text-amber-600" />}
        />
        <StatCard label="Total Nilai Pending" value={formatIDR(totalPendingAmount)} icon={<WalletCards className="h-5 w-5 text-amber-600" />} />
        <StatCard label="Event Siap Ditutup" value={closingEvents.length} icon={<CircleCheck className="h-5 w-5 text-emerald-600" />} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Expense Menunggu Persetujuan</h2>
        {rows.length === 0 ? (
          <Card>
            <CardContent className="px-6 py-10 text-center">
              <p className="font-medium">Tidak ada expense pending</p>
              <p className="text-sm text-muted-foreground">Semua expense sudah diputuskan.</p>
            </CardContent>
          </Card>
        ) : (
          <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Financial Closing</h2>
        {closingEvents.length === 0 ? (
          <Card>
            <CardContent className="px-6 py-10 text-center">
              <p className="font-medium">Tidak ada event yang menunggu ditutup</p>
              <p className="text-sm text-muted-foreground">Event yang berstatus Financial Closing akan tampil di sini.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {closingEvents.map((ev) => {
              const m = marginOf(ev.revenue, ev.actual_cost)
              return (
                <Card key={ev.id}>
                  <CardContent className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <Link href={`/events/${ev.id}?tab=financial`} className="font-mono text-sm font-semibold text-indigo-600 hover:underline">
                          {ev.event_code ?? "EVT"}
                        </Link>
                        <p className="text-sm font-medium">{ev.event_name}</p>
                      </div>
                      {ev.pending_expense_count > 0 ? (
                        <Badge variant="destructive">{ev.pending_expense_count} expense pending</Badge>
                      ) : (
                        <Badge variant="secondary">Siap ditutup</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ev.customer_name ?? "Tanpa customer"} · {ev.start_date ? formatDate(ev.start_date, "d MMM yyyy") : "Tanpa tanggal"}
                    </p>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Revenue</dt>
                        <dd className="font-medium">{ev.revenue != null ? formatIDR(ev.revenue) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Actual Cost</dt>
                        <dd className="font-medium">{ev.actual_cost != null ? formatIDR(ev.actual_cost) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Margin</dt>
                        <dd>
                          {m ? (
                            <span className={cn("font-medium", m.pct < 0 ? "text-destructive" : m.pct < 25 ? "text-amber-600" : "")}>
                              {m.pct.toFixed(1)}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" render={<Link href={`/events/${ev.id}?tab=financial`}>Buka Event</Link>} />
                      {canClose && ev.pending_expense_count === 0 ? (
                        <Button size="sm" disabled={pending} onClick={() => setCloseDialog(ev)}>
                          Tutup Financial
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <Dialog open={!!decideDialog} onOpenChange={(o) => !o && setDecideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decideDialog?.approve ? "Setujui Expense" : "Tolak Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{decideDialog?.row.description}</span> —{" "}
              <span className="font-medium">{decideDialog?.row.amount != null ? formatIDR(decideDialog.row.amount) : ""}</span>{" "}
              ({decideDialog?.row.events?.event_name})
            </p>
            {decideDialog && !decideDialog.approve && (
              <Textarea
                autoFocus
                rows={3}
                placeholder="Alasan penolakan..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
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

      <Dialog open={!!closeDialog} onOpenChange={(o) => !o && setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup Financial</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-mono font-semibold">{closeDialog?.event_code}</span> — {closeDialog?.event_name}. Snapshot
              revenue, biaya, dan margin akan dibuat permanen dari data saat ini.
            </p>
            {closeDialog && marginOf(closeDialog.revenue, closeDialog.actual_cost) && marginOf(closeDialog.revenue, closeDialog.actual_cost)!.pct < 0 ? (
              <Textarea
                autoFocus
                rows={3}
                placeholder="Penjelasan margin negatif (wajib)..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
              />
            ) : (
              <p className="text-muted-foreground">Tambahkan penjelasan margin negatif jika margin diperkirakan negatif.</p>
            )}
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={submitClose}>
              Tutup Event Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-3.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">{icon}</span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}