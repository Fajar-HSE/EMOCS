"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  changeRequestSchema,
  CHANGE_REQUEST_FIELDS,
  type ChangeRequestInput,
} from "@/lib/validations/change-request"
import { createChangeRequest, decideChangeRequest } from "@/actions/change-request-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ChangeRequest = {
  id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  reason: string
  cost_impact_note: string | null
  status: string
  rejection_reason: string | null
  requester: { full_name: string } | null
}

const FIELD_LABEL = Object.fromEntries(CHANGE_REQUEST_FIELDS.map((f) => [f.value, f.label]))
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
}

function displayValue(fieldName: string, value: string | null, trainings: { id: string; name: string }[]) {
  if (value == null) return "—"
  if (fieldName === "training_id") return trainings.find((t) => t.id === value)?.name ?? value
  return value
}

export function ChangeRequestPanel({
  eventId,
  requests,
  trainings,
  canApprove,
}: {
  eventId: string
  requests: ChangeRequest[]
  trainings: { id: string; name: string }[]
  canApprove: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const form = useForm<ChangeRequestInput>({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: { field_name: "start_date", new_value: "", reason: "", cost_impact_note: "" },
  })
  const selectedField = CHANGE_REQUEST_FIELDS.find((f) => f.value === form.watch("field_name"))

  async function onSubmit(values: ChangeRequestInput) {
    const result = await createChangeRequest(eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal mengajukan perubahan")
      return
    }
    toast.success("Perubahan diajukan, menunggu persetujuan Ops Manager")
    form.reset({ field_name: "start_date", new_value: "", reason: "", cost_impact_note: "" })
    setOpen(false)
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      const r = await decideChangeRequest(id, eventId, true)
      if (!r.ok) toast.error(r.message ?? "Gagal menyetujui")
    })
  }

  function submitReject() {
    if (!rejectId) return
    if (!rejectReason.trim()) {
      toast.error("Alasan penolakan wajib diisi")
      return
    }
    startTransition(async () => {
      const r = await decideChangeRequest(rejectId, eventId, false, rejectReason)
      if (!r.ok) toast.error(r.message ?? "Gagal menolak")
    })
    setRejectId(null)
    setRejectReason("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm">+ Ajukan Perubahan</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajukan Perubahan Event</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="field_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field yang Diubah</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v)
                          form.setValue("new_value", "")
                        }}
                        items={CHANGE_REQUEST_FIELDS.map((f) => ({ value: f.value, label: f.label }))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHANGE_REQUEST_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
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
                  name="new_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nilai Baru</FormLabel>
                      <FormControl>
                        {selectedField?.type === "date" ? (
                          <Input type="date" {...field} />
                        ) : selectedField?.type === "number" ? (
                          <Input
                            type="number"
                            min={1}
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        ) : selectedField?.type === "training" ? (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            items={trainings.map((t) => ({ value: t.id, label: t.name }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih training" />
                            </SelectTrigger>
                            <SelectContent>
                              {trainings.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alasan Perubahan</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost_impact_note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dampak Biaya (opsional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    Ajukan
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {requests.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">Belum ada pengajuan perubahan.</p>
      )}

      {requests.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Perubahan</TableHead>
              <TableHead>Pemohon</TableHead>
              <TableHead>Status</TableHead>
              {canApprove && <TableHead className="w-40" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{FIELD_LABEL[r.field_name] ?? r.field_name}</TableCell>
                <TableCell>
                  {displayValue(r.field_name, r.old_value, trainings)} →{" "}
                  {displayValue(r.field_name, r.new_value, trainings)}
                  <p className="text-muted-foreground text-xs">{r.reason}</p>
                  {r.status === "REJECTED" && r.rejection_reason && (
                    <p className="text-muted-foreground text-xs">Ditolak: {r.rejection_reason}</p>
                  )}
                </TableCell>
                <TableCell>{r.requester?.full_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                </TableCell>
                {canApprove && (
                  <TableCell className="flex justify-end gap-1">
                    {r.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => handleApprove(r.id)}>
                          Setujui
                        </Button>
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRejectId(r.id)}>
                          Tolak
                        </Button>
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan Perubahan</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="mb-1.5">Alasan Penolakan</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={submitReject}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
