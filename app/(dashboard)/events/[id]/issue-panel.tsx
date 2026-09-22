"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { issueSchema, type IssueInput } from "@/lib/validations/issue"
import { ISSUE_CATEGORY_LABELS, ISSUE_SEVERITY_LABELS } from "@/lib/validations/labels"
import { createIssue, updateIssueStatus } from "@/actions/issue-actions"
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

type Issue = {
  id: string
  title: string
  category: string
  severity: string
  status: string
  description: string | null
  resolution: string | null
  root_cause: string | null
  assignee: { full_name: string } | null
}

const CATEGORIES = ["TRAINER", "VENUE", "PARTICIPANT", "EQUIPMENT", "MATERIAL", "CUSTOMER", "LOGISTIC", "FINANCE", "OTHER"]
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
const STATUS_LABEL: Record<string, string> = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Dikerjakan",
  RESOLVED: "Terselesaikan",
  CLOSED: "Ditutup",
}
const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "secondary",
  HIGH: "destructive",
  CRITICAL: "destructive",
}

export function IssuePanel({
  eventId,
  issues,
  assignees,
  canManage,
}: {
  eventId: string
  issues: Issue[]
  assignees: { id: string; full_name: string }[]
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [resolveDialog, setResolveDialog] = useState<{ id: string; status: "RESOLVED" | "CLOSED"; needsRootCause: boolean } | null>(null)
  const [resolution, setResolution] = useState("")
  const [rootCause, setRootCause] = useState("")

  const form = useForm<IssueInput>({
    resolver: zodResolver(issueSchema),
    defaultValues: { title: "", category: "OTHER", severity: "MEDIUM", description: "" },
  })

  async function onSubmit(values: IssueInput) {
    const result = await createIssue(eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal melaporkan issue")
      return
    }
    toast.success("Issue dilaporkan")
    form.reset()
    setOpen(false)
  }

  function handleStatusChange(issue: Issue, status: string) {
    if (status === "RESOLVED" || status === "CLOSED") {
      setResolveDialog({
        id: issue.id,
        status,
        needsRootCause: status === "CLOSED" && (issue.severity === "HIGH" || issue.severity === "CRITICAL"),
      })
      return
    }
    startTransition(async () => {
      const result = await updateIssueStatus(issue.id, eventId, status as never)
      if (!result.ok) toast.error(result.message ?? "Gagal mengubah status")
    })
  }

  function submitResolve() {
    if (!resolveDialog) return
    if (resolveDialog.needsRootCause && !rootCause.trim()) {
      toast.error("Root cause wajib diisi untuk menutup issue HIGH/CRITICAL")
      return
    }
    const { id, status } = resolveDialog
    startTransition(async () => {
      const result = await updateIssueStatus(id, eventId, status, resolution, rootCause)
      if (!result.ok) toast.error(result.message ?? "Gagal")
    })
    setResolveDialog(null)
    setResolution("")
    setRootCause("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm">+ Issue</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Laporkan Issue</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Judul</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="mis. Trainer terlambat konfirmasi" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          items={CATEGORIES.map((v) => ({
                            value: v,
                            label: ISSUE_CATEGORY_LABELS[v as keyof typeof ISSUE_CATEGORY_LABELS] ?? v,
                          }))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {ISSUE_CATEGORY_LABELS[v as keyof typeof ISSUE_CATEGORY_LABELS] ?? v}
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
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          items={SEVERITIES.map((v) => ({
                            value: v,
                            label: ISSUE_SEVERITY_LABELS[v as keyof typeof ISSUE_SEVERITY_LABELS] ?? v,
                          }))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEVERITIES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {ISSUE_SEVERITY_LABELS[v as keyof typeof ISSUE_SEVERITY_LABELS] ?? v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="assignee_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Penanggung Jawab (opsional)</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        items={assignees.map((a) => ({ value: a.id, label: a.full_name }))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Belum ditentukan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assignees.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.full_name}
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
                      <FormLabel>Deskripsi (opsional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    Laporkan
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {issues.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">Belum ada issue dilaporkan.</p>
      )}

      {issues.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>PJ</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell className="font-medium">
                  {issue.title}
                  {issue.description && <p className="text-muted-foreground text-xs">{issue.description}</p>}
                  {(issue.status === "RESOLVED" || issue.status === "CLOSED") && issue.resolution && (
                    <p className="text-muted-foreground text-xs">Resolusi: {issue.resolution}</p>
                  )}
                </TableCell>
                <TableCell>{issue.category}</TableCell>
                <TableCell>
                  <Badge variant={SEVERITY_VARIANT[issue.severity]}>{issue.severity}</Badge>
                </TableCell>
                <TableCell>{issue.assignee?.full_name ?? "—"}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Select
                      value={issue.status}
                      onValueChange={(v) => v && handleStatusChange(issue, v)}
                      disabled={pending}
                      items={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue>{STATUS_LABEL[issue.status]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{STATUS_LABEL[issue.status]}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!resolveDialog} onOpenChange={(o) => !o && setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resolveDialog?.status === "CLOSED" ? "Tutup Issue" : "Tandai Terselesaikan"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5">Resolusi</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2} />
            </div>
            {resolveDialog?.needsRootCause && (
              <div>
                <Label className="mb-1.5">Root Cause (wajib untuk severity HIGH/CRITICAL)</Label>
                <Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={submitResolve}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
