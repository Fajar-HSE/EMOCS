"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { taskSchema, type TaskInput } from "@/lib/validations/task"
import { TASK_PRIORITY_LABELS } from "@/lib/validations/labels"
import { createTask, updateTaskStatus, deleteTask, applyTaskTemplate } from "@/actions/task-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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

type Task = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string
  is_mandatory: boolean
  blocked_reason: string | null
  assignee: { full_name: string } | null
}

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]
const STATUS_LABEL: Record<string, string> = {
  TODO: "Todo",
  IN_PROGRESS: "Dikerjakan",
  BLOCKED: "Terhambat",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
}

export function TaskPanel({
  eventId,
  tasks,
  assignees,
  taskTemplates,
  canManage,
}: {
  eventId: string
  tasks: Task[]
  assignees: { id: string; full_name: string }[]
  taskTemplates: { id: string; name: string }[]
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [blockDialogTaskId, setBlockDialogTaskId] = useState<string | null>(null)
  const [blockReason, setBlockReason] = useState("")

  function handleApplyTemplate(templateId: string) {
    startTransition(async () => {
      const result = await applyTaskTemplate(eventId, templateId)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menerapkan template")
        return
      }
      toast.success(result.message ?? "Template diterapkan")
    })
  }

  const form = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", priority: "NORMAL", is_mandatory: false },
  })

  async function onSubmit(values: TaskInput) {
    const result = await createTask(eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal membuat task")
      return
    }
    toast.success("Task dibuat")
    form.reset()
    setOpen(false)
  }

  function handleStatusChange(taskId: string, status: string) {
    if (status === "BLOCKED") {
      setBlockDialogTaskId(taskId)
      return
    }
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, eventId, status as never)
      if (!result.ok) toast.error(result.message ?? "Gagal mengubah status")
    })
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      const result = await deleteTask(taskId, eventId)
      if (!result.ok) toast.error(result.message ?? "Gagal menghapus task")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end gap-2">
          {taskTemplates.length > 0 && (
            <Select value="" onValueChange={(v) => v && handleApplyTemplate(v)} disabled={pending}>
              <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="Terapkan template..." />
              </SelectTrigger>
              <SelectContent>
                {taskTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm">+ Task</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Task Baru</DialogTitle>
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assignee_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Penanggung Jawab</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          items={assignees.map((a) => ({ value: a.id, label: a.full_name }))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih" />
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenggat</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioritas</FormLabel>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                            items={["LOW", "NORMAL", "HIGH", "CRITICAL"].map((v) => ({
                              value: v,
                              label:
                                TASK_PRIORITY_LABELS[v as keyof typeof TASK_PRIORITY_LABELS] ?? v,
                            }))}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pilih" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["LOW", "NORMAL", "HIGH", "CRITICAL"].map((v) => (
                                <SelectItem key={v} value={v}>
                                  {TASK_PRIORITY_LABELS[v as keyof typeof TASK_PRIORITY_LABELS] ?? v}
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deskripsi (opsional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_mandatory"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          Mandatory (menghalangi transisi ke READY)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      Simpan
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {tasks.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada task — buat dari template atau tambah manual.
        </p>
      )}

      {tasks.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Penanggung Jawab</TableHead>
              <TableHead>Tenggat</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => {
              const overdue = t.status !== "DONE" && t.status !== "CANCELLED" && new Date(t.due_date) < new Date()
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.title}
                    {t.is_mandatory && (
                      <Badge variant="secondary" className="ml-1">
                        Wajib
                      </Badge>
                    )}
                    {overdue && (
                      <Badge variant="destructive" className="ml-1">
                        Telat
                      </Badge>
                    )}
                    {t.status === "BLOCKED" && t.blocked_reason && (
                      <p className="text-muted-foreground text-xs">{t.blocked_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>{t.assignee?.full_name ?? "—"}</TableCell>
                  <TableCell>{t.due_date}</TableCell>
                  <TableCell>{t.priority}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select
                        value={t.status}
                        onValueChange={(v) => v && handleStatusChange(t.id, v)}
                        items={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue>{STATUS_LABEL[t.status]}</SelectValue>
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
                      <Badge variant="secondary">{STATUS_LABEL[t.status]}</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => handleDelete(t.id)}>
                        Hapus
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!blockDialogTaskId} onOpenChange={(o) => !o && setBlockDialogTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alasan Terhambat</DialogTitle>
          </DialogHeader>
          <Label className="mb-1.5">Alasan</Label>
          <Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => {
                const taskId = blockDialogTaskId!
                startTransition(async () => {
                  const result = await updateTaskStatus(taskId, eventId, "BLOCKED", blockReason)
                  if (!result.ok) toast.error(result.message ?? "Gagal")
                })
                setBlockDialogTaskId(null)
                setBlockReason("")
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
