"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { taskTemplateItemSchema, type TaskTemplateItemInput } from "@/lib/validations/templates"
import { TASK_PRIORITY_LABELS } from "@/lib/validations/labels"
import { addTaskTemplateItem } from "@/actions/template-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"]

export function TaskItemForm({ templateId }: { templateId: string }) {
  const router = useRouter()
  const form = useForm<TaskTemplateItemInput>({
    resolver: zodResolver(taskTemplateItemSchema),
    defaultValues: { title: "", description: "", days_before_event: 7, priority: "NORMAL", is_mandatory: false },
  })

  async function onSubmit(values: TaskTemplateItemInput) {
    const result = await addTaskTemplateItem(templateId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menambah item")
      return
    }
    toast.success("Item task ditambahkan")
    form.reset({ title: "", description: "", days_before_event: 7, priority: "NORMAL", is_mandatory: false })
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="min-w-52 flex-1">
              <FormLabel>Judul Task</FormLabel>
              <FormControl>
                <Input {...field} placeholder="mis. Kirim undangan peserta" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="days_before_event"
          render={({ field }) => (
            <FormItem className="w-28">
              <FormLabel>H- (hari)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem className="w-36">
              <FormLabel>Prioritas</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={PRIORITIES.map((v) => ({
                  value: v,
                  label: TASK_PRIORITY_LABELS[v as keyof typeof TASK_PRIORITY_LABELS] ?? v,
                }))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRIORITIES.map((v) => (
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
        <FormField
          control={form.control}
          name="is_mandatory"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 pb-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Wajib</FormLabel>
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          + Tambah Item
        </Button>
      </form>
    </Form>
  )
}
