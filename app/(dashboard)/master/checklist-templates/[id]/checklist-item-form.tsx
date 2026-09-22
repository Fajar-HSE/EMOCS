"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { checklistTemplateItemSchema, type ChecklistTemplateItemInput } from "@/lib/validations/templates"
import { addChecklistTemplateItem } from "@/actions/template-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export function ChecklistItemForm({ templateId }: { templateId: string }) {
  const router = useRouter()
  const form = useForm<ChecklistTemplateItemInput>({
    resolver: zodResolver(checklistTemplateItemSchema),
    defaultValues: { category: "", label: "", is_mandatory: false },
  })

  async function onSubmit(values: ChecklistTemplateItemInput) {
    const result = await addChecklistTemplateItem(templateId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menambah item")
      return
    }
    toast.success("Item checklist ditambahkan")
    form.reset()
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="w-40">
              <FormLabel>Kategori</FormLabel>
              <FormControl>
                <Input {...field} placeholder="mis. Venue" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem className="min-w-60 flex-1">
              <FormLabel>Label Item</FormLabel>
              <FormControl>
                <Input {...field} placeholder="mis. Konfirmasi venue H-7" />
              </FormControl>
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
