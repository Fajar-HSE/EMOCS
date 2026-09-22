"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { expenseSchema, expensePaymentMethods, type ExpenseInput } from "@/lib/validations/expense"
import { hasAnyRole, type Role } from "@/lib/auth/roles"
import {
  createEventBudget,
  submitEventBudget,
  decideEventBudget,
  deleteEventBudgetDraft,
} from "@/actions/budget-actions"
import {
  createExpense,
  submitExpense,
  decideExpense,
  markExpensePaid,
  deleteExpenseDraft,
  attachExpenseReceipt,
} from "@/actions/expense-actions"
import { applyFinancialClosing } from "@/actions/financial-actions"
import { PAYMENT_METHOD_LABELS } from "@/lib/validations/labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

function currency(v: number | null | undefined) {
  return v != null ? v.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }) : "—"
}

type Option = { id: string; name: string }
type DocumentOption = { id: string; file_name: string }

type BudgetItemRow = { cost_category_id: string; planned_amount: number; cost_categories: { name: string } | null }
type BudgetRow = {
  id: string
  version: number
  status: string
  total_amount: number
  event_budget_items: BudgetItemRow[]
}
type ExpenseRow = {
  id: string
  description: string
  amount: number
  status: string
  cost_category_id: string
  cost_categories: { name: string } | null
  receipt_document_id: string | null
}
type ClosingRow = {
  id: string
  revenue_recognized: number
  actual_cost: number
  gross_profit: number
  gross_margin_pct: number | null
  margin_health: string | null
  negative_margin_explanation: string | null
  closed_at: string
  reopened_at: string | null
  reopened_reason: string | null
}
type VarianceRow = {
  cost_category_id: string
  cost_category_name: string
  budgeted_amount: number
  actual_amount: number
  variance_amount: number
  variance_pct: number | null
  band: string
}

const BUDGET_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Diajukan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  SUPERSEDED: "Digantikan",
}
const BUDGET_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SUBMITTED: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  SUPERSEDED: "secondary",
}
const EXPENSE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Diajukan",
  UNDER_REVIEW: "Ditinjau",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  PAID: "Dibayar",
}
const EXPENSE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SUBMITTED: "outline",
  UNDER_REVIEW: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  PAID: "default",
}
const BAND_LABEL: Record<string, string> = {
  NO_BUDGET: "Tanpa Budget",
  UNDER: "Di Bawah Budget",
  ON_BUDGET: "Sesuai Budget",
  OVER: "Melebihi Budget",
  ALERT: "Alert (>15%)",
}
const BAND_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NO_BUDGET: "outline",
  UNDER: "secondary",
  ON_BUDGET: "default",
  OVER: "destructive",
  ALERT: "destructive",
}
const MARGIN_LABEL: Record<string, string> = {
  GREEN: "Sehat (≥40%)",
  YELLOW: "Waspada (25–40%)",
  RED: "Rendah (<25%)",
  NEGATIVE: "Negatif",
}

export function FinancialPanel({
  eventId,
  eventStatus,
  budgets,
  expenses,
  costCategories,
  vendors,
  receiptDocuments,
  costsSummary,
  revenue,
  variance,
  closings,
  roles,
}: {
  eventId: string
  eventStatus: string
  budgets: BudgetRow[]
  expenses: ExpenseRow[]
  costCategories: Option[]
  vendors: Option[]
  receiptDocuments: DocumentOption[]
  costsSummary: { actual_cost: number; pending_cost: number; projected_cost: number } | null
  revenue: number | null
  variance: VarianceRow[]
  closings: ClosingRow[]
  roles: Role[]
}) {
  const canManageBudget = hasAnyRole(roles, ["OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"])
  const canManageExpense = hasAnyRole(roles, ["OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "ADMIN"])
  const canDecideFinancial = hasAnyRole(roles, ["OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "MANAGEMENT", "ADMIN"])
  const canMarkPaid = hasAnyRole(roles, ["FINANCE", "ADMIN"])
  const canCloseFinancial = hasAnyRole(roles, ["FINANCE", "ADMIN"])

  return (
    <div className="flex flex-col gap-8">
      <BudgetSection
        eventId={eventId}
        budgets={budgets}
        costCategories={costCategories}
        canManage={canManageBudget}
        canDecide={canDecideFinancial}
      />
      <ExpenseSection
        eventId={eventId}
        expenses={expenses}
        costCategories={costCategories}
        vendors={vendors}
        receiptDocuments={receiptDocuments}
        canManage={canManageExpense}
        canDecide={canDecideFinancial}
        canMarkPaid={canMarkPaid}
      />
      <SummarySection costsSummary={costsSummary} revenue={revenue} variance={variance} />
      <ClosingSection
        eventId={eventId}
        eventStatus={eventStatus}
        expenses={expenses}
        closings={closings}
        canClose={canCloseFinancial}
      />
    </div>
  )
}

function BudgetSection({
  eventId,
  budgets,
  costCategories,
  canManage,
  canDecide,
}: {
  eventId: string
  budgets: BudgetRow[]
  costCategories: Option[]
  canManage: boolean
  canDecide: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [items, setItems] = useState<{ cost_category_id: string; planned_amount: string }[]>([
    { cost_category_id: "", planned_amount: "" },
  ])
  const [decideDialog, setDecideDialog] = useState<{ id: string; approve: boolean } | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  const hasInFlight = budgets.some((b) => b.status === "DRAFT" || b.status === "SUBMITTED")
  const approved = budgets.find((b) => b.status === "APPROVED")

  function updateItemRow(idx: number, patch: Partial<{ cost_category_id: string; planned_amount: string }>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function submitCreate() {
    const parsed = items
      .filter((it) => it.cost_category_id)
      .map((it) => ({ cost_category_id: it.cost_category_id, planned_amount: Number(it.planned_amount) || 0 }))
    if (parsed.length === 0) {
      toast.error("Tambahkan minimal 1 item budget")
      return
    }
    startTransition(async () => {
      const result = await createEventBudget(eventId, parsed)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal membuat budget")
        return
      }
      toast.success("Draft budget tersimpan")
      setCreateOpen(false)
      setItems([{ cost_category_id: "", planned_amount: "" }])
      router.refresh()
    })
  }

  function submitDecide() {
    if (!decideDialog) return
    if (!decideDialog.approve && !rejectionReason.trim()) {
      toast.error("Alasan penolakan wajib diisi")
      return
    }
    const { id, approve } = decideDialog
    startTransition(async () => {
      const result = await decideEventBudget(id, eventId, approve, rejectionReason)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal")
        return
      }
      toast.success(approve ? "Budget disetujui" : "Budget ditolak")
      router.refresh()
    })
    setDecideDialog(null)
    setRejectionReason("")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Budget</h3>
        {canManage && !hasInFlight && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            + Ajukan Budget
          </Button>
        )}
      </div>

      {approved && (
        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">
            Budget Disetujui (v{approved.version}) — {currency(approved.total_amount)}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Rencana</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approved.event_budget_items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>{it.cost_categories?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">{currency(it.planned_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {budgets.length === 0 && <p className="text-muted-foreground text-sm">Belum ada budget diajukan.</p>}

      {budgets.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Versi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((b) => (
              <TableRow key={b.id}>
                <TableCell>v{b.version}</TableCell>
                <TableCell>
                  <Badge variant={BUDGET_STATUS_VARIANT[b.status]}>{BUDGET_STATUS_LABEL[b.status] ?? b.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{currency(b.total_amount)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {b.status === "DRAFT" && canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await submitEventBudget(b.id, eventId)
                              if (!r.ok) toast.error(r.message ?? "Gagal mengajukan")
                              else {
                                toast.success("Budget diajukan")
                                router.refresh()
                              }
                            })
                          }
                        >
                          Ajukan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await deleteEventBudgetDraft(b.id, eventId)
                              if (!r.ok) toast.error(r.message ?? "Gagal menghapus")
                              else router.refresh()
                            })
                          }
                        >
                          Hapus
                        </Button>
                      </>
                    )}
                    {b.status === "SUBMITTED" && canDecide && (
                      <>
                        <Button size="sm" disabled={pending} onClick={() => setDecideDialog({ id: b.id, approve: true })}>
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => setDecideDialog({ id: b.id, approve: false })}
                        >
                          Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Budget Baru</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={it.cost_category_id}
                  onValueChange={(v) => updateItemRow(idx, { cost_category_id: v ?? "" })}
                  items={costCategories.map((c) => ({ value: c.id, label: c.name }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  placeholder="Nominal"
                  value={it.planned_amount}
                  onChange={(e) => updateItemRow(idx, { planned_amount: e.target.value })}
                />
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  >
                    Hapus
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setItems([...items, { cost_category_id: "", planned_amount: "" }])}
            >
              + Tambah Item
            </Button>
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={submitCreate}>
              Simpan Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decideDialog} onOpenChange={(o) => !o && setDecideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decideDialog?.approve ? "Setujui Budget" : "Tolak Budget"}</DialogTitle>
          </DialogHeader>
          {decideDialog && !decideDialog.approve && (
            <Textarea placeholder="Alasan penolakan..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          )}
          <DialogFooter>
            <Button disabled={pending} onClick={submitDecide}>
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ExpenseSection({
  eventId,
  expenses,
  costCategories,
  vendors,
  receiptDocuments,
  canManage,
  canDecide,
  canMarkPaid,
}: {
  eventId: string
  expenses: ExpenseRow[]
  costCategories: Option[]
  vendors: Option[]
  receiptDocuments: DocumentOption[]
  canManage: boolean
  canDecide: boolean
  canMarkPaid: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [decideDialog, setDecideDialog] = useState<{ id: string; approve: boolean } | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      cost_category_id: "",
      description: "",
      amount: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: "REIMBURSEMENT",
    },
  })

  async function onCreateSubmit(values: ExpenseInput) {
    const result = await createExpense(eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal membuat expense")
      return
    }
    toast.success("Draft expense tersimpan")
    form.reset()
    setCreateOpen(false)
    router.refresh()
  }

  function submitDecide() {
    if (!decideDialog) return
    if (!decideDialog.approve && !rejectionReason.trim()) {
      toast.error("Alasan penolakan wajib diisi")
      return
    }
    const { id, approve } = decideDialog
    startTransition(async () => {
      const result = await decideExpense(id, eventId, approve, rejectionReason)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal")
        return
      }
      toast.success(approve ? "Expense disetujui" : "Expense ditolak")
      router.refresh()
    })
    setDecideDialog(null)
    setRejectionReason("")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Expense</h3>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            + Ajukan Expense
          </Button>
        )}
      </div>

      {expenses.length === 0 && <p className="text-muted-foreground text-sm">Belum ada expense.</p>}

      {expenses.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Bukti</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.description}</TableCell>
                <TableCell>{e.cost_categories?.name ?? "—"}</TableCell>
                <TableCell className="text-right">{currency(e.amount)}</TableCell>
                <TableCell>
                  {e.receipt_document_id ? (
                    "Terlampir"
                  ) : e.status === "DRAFT" && canManage && receiptDocuments.length > 0 ? (
                    <Select
                      onValueChange={(v) =>
                        v &&
                        startTransition(async () => {
                          const r = await attachExpenseReceipt(e.id, eventId, v as string)
                          if (!r.ok) toast.error(r.message ?? "Gagal melampirkan bukti")
                          else router.refresh()
                        })
                      }
                      items={receiptDocuments.map((d) => ({ value: d.id, label: d.file_name }))}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue placeholder="Lampirkan" />
                      </SelectTrigger>
                      <SelectContent>
                        {receiptDocuments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.file_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={EXPENSE_STATUS_VARIANT[e.status]}>{EXPENSE_STATUS_LABEL[e.status] ?? e.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {e.status === "DRAFT" && canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await submitExpense(e.id, eventId)
                              if (!r.ok) toast.error(r.message ?? "Gagal mengajukan")
                              else {
                                toast.success("Expense diajukan")
                                router.refresh()
                              }
                            })
                          }
                        >
                          Ajukan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await deleteExpenseDraft(e.id, eventId)
                              if (!r.ok) toast.error(r.message ?? "Gagal menghapus")
                              else router.refresh()
                            })
                          }
                        >
                          Hapus
                        </Button>
                      </>
                    )}
                    {(e.status === "SUBMITTED" || e.status === "UNDER_REVIEW") && canDecide && (
                      <>
                        <Button size="sm" disabled={pending} onClick={() => setDecideDialog({ id: e.id, approve: true })}>
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => setDecideDialog({ id: e.id, approve: false })}
                        >
                          Tolak
                        </Button>
                      </>
                    )}
                    {e.status === "APPROVED" && canMarkPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await markExpensePaid(e.id, eventId)
                            if (!r.ok) toast.error(r.message ?? "Gagal")
                            else {
                              toast.success("Ditandai dibayar")
                              router.refresh()
                            }
                          })
                        }
                      >
                        Tandai Dibayar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Expense Baru</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="cost_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori Biaya</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={costCategories.map((c) => ({ value: c.id, label: c.name }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {costCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nominal</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expense_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metode Pembayaran</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={expensePaymentMethods.map((p) => ({
                        value: p,
                        label: PAYMENT_METHOD_LABELS[p as keyof typeof PAYMENT_METHOD_LABELS] ?? p,
                      }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expensePaymentMethods.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PAYMENT_METHOD_LABELS[p as keyof typeof PAYMENT_METHOD_LABELS] ?? p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (opsional)</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={vendors.map((v) => ({ value: v.id, label: v.name }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receipt_document_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bukti/Kuitansi (opsional, dari tab Documents)</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={receiptDocuments.map((d) => ({ value: d.id, label: d.file_name }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih dokumen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {receiptDocuments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.file_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="justification_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justifikasi (wajib jika di luar budget kategori)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Simpan Draft
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decideDialog} onOpenChange={(o) => !o && setDecideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decideDialog?.approve ? "Setujui Expense" : "Tolak Expense"}</DialogTitle>
          </DialogHeader>
          {decideDialog && !decideDialog.approve && (
            <Textarea placeholder="Alasan penolakan..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          )}
          <DialogFooter>
            <Button disabled={pending} onClick={submitDecide}>
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummarySection({
  costsSummary,
  revenue,
  variance,
}: {
  costsSummary: { actual_cost: number; pending_cost: number; projected_cost: number } | null
  revenue: number | null
  variance: VarianceRow[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Ringkasan Finansial</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Revenue Recognized" value={currency(revenue)} />
        <SummaryStat label="Actual Cost" value={currency(costsSummary?.actual_cost)} />
        <SummaryStat label="Pending Cost" value={currency(costsSummary?.pending_cost)} />
        <SummaryStat label="Projected Cost" value={currency(costsSummary?.projected_cost)} />
      </div>
      {variance.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variance.map((v) => (
              <TableRow key={v.cost_category_id}>
                <TableCell>{v.cost_category_name}</TableCell>
                <TableCell className="text-right">{currency(v.budgeted_amount)}</TableCell>
                <TableCell className="text-right">{currency(v.actual_amount)}</TableCell>
                <TableCell className="text-right">{v.variance_pct != null ? `${v.variance_pct.toFixed(1)}%` : "—"}</TableCell>
                <TableCell>
                  <Badge variant={BAND_VARIANT[v.band]}>{BAND_LABEL[v.band] ?? v.band}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function ClosingSection({
  eventId,
  eventStatus,
  expenses,
  closings,
  canClose,
}: {
  eventId: string
  eventStatus: string
  expenses: ExpenseRow[]
  closings: ClosingRow[]
  canClose: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [closeDialog, setCloseDialog] = useState(false)
  const [explanation, setExplanation] = useState("")

  const pendingExpenseCount = expenses.filter((e) => e.status === "SUBMITTED" || e.status === "UNDER_REVIEW").length
  const latestClosing = closings[0]

  function submitClose() {
    startTransition(async () => {
      const result = await applyFinancialClosing(eventId, explanation || undefined)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menutup event")
        return
      }
      toast.success("Financial closing berhasil")
      setCloseDialog(false)
      setExplanation("")
      router.refresh()
    })
  }

  if (eventStatus !== "FINANCIAL_CLOSING" && closings.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Financial Closing</h3>

      {eventStatus === "FINANCIAL_CLOSING" && (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm">
            {pendingExpenseCount > 0
              ? `${pendingExpenseCount} expense masih menunggu keputusan — belum bisa ditutup.`
              : "Tidak ada expense pending."}
          </p>
          {canClose && (
            <Button size="sm" className="w-fit" onClick={() => setCloseDialog(true)}>
              Tutup Financial
            </Button>
          )}
        </div>
      )}

      {latestClosing && (
        <div className="rounded-md border p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            Snapshot Terakhir ({new Date(latestClosing.closed_at).toLocaleString("id-ID")})
            {latestClosing.reopened_at && <Badge variant="secondary">Sudah dibuka kembali</Badge>}
          </p>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground text-xs">Revenue</dt>
              <dd>{currency(latestClosing.revenue_recognized)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Actual Cost</dt>
              <dd>{currency(latestClosing.actual_cost)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Gross Profit</dt>
              <dd>{currency(latestClosing.gross_profit)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Margin</dt>
              <dd>
                {latestClosing.gross_margin_pct != null ? `${latestClosing.gross_margin_pct.toFixed(1)}%` : "—"}{" "}
                {latestClosing.margin_health && `(${MARGIN_LABEL[latestClosing.margin_health]})`}
              </dd>
            </div>
          </dl>
          {latestClosing.negative_margin_explanation && (
            <p className="text-muted-foreground mt-2 text-sm">
              Penjelasan margin negatif: {latestClosing.negative_margin_explanation}
            </p>
          )}
          {latestClosing.reopened_reason && (
            <p className="text-muted-foreground mt-2 text-sm">Alasan dibuka kembali: {latestClosing.reopened_reason}</p>
          )}
        </div>
      )}

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup Financial</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="mb-1.5">Penjelasan Margin Negatif (wajib hanya jika margin negatif)</Label>
            <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={submitClose}>
              Tutup Event Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
