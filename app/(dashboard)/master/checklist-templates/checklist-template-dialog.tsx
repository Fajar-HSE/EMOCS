"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { checklistTemplateSchema, type ChecklistTemplateInput } from "@/lib/validations/templates"
import { createChecklistTemplate } from "@/actions/template-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

import { EVENT_TYPES, EVENT_TYPE_LABELS } from "@/lib/validations/event"
import { DELIVERY_MODE_LABELS } from "@/lib/validations/labels"

const DELIVERY_MODES = ["OFFLINE", "ONLINE", "HYBRID"]

export function ChecklistTemplateDialog({ trainings }: { trainings: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const form = useForm<ChecklistTemplateInput>({
    resolver: zodResolver(checklistTemplateSchema),
    defaultValues: { name: "" },
  })

  async function onSubmit(values: ChecklistTemplateInput) {
    const result = await createChecklistTemplate(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan template")
      return
    }
    toast.success("Template checklist baru tersimpan")
    form.reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ Template baru</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Template Checklist Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Template</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="mis. Checklist K3 Inhouse" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-muted-foreground text-xs">
              Kriteria di bawah ini opsional — dipakai untuk memilih template paling cocok
              secara otomatis untuk sebuah event. Biarkan kosong untuk berlaku ke semua.
            </p>
            <FormField
              control={form.control}
              name="training_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    items={trainings.map((t) => ({ value: t.id, label: t.name }))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Semua training" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trainings.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
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
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Event</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={EVENT_TYPES.map((v) => ({ value: v, label: EVENT_TYPE_LABELS[v] }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Semua tipe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_TYPES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {EVENT_TYPE_LABELS[v]}
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
                name="delivery_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode Delivery</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={DELIVERY_MODES.map((v) => ({
                        value: v,
                        label: DELIVERY_MODE_LABELS[v as keyof typeof DELIVERY_MODE_LABELS],
                      }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Semua mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DELIVERY_MODES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {DELIVERY_MODE_LABELS[v as keyof typeof DELIVERY_MODE_LABELS]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. Peserta</FormLabel>
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
                name="max_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maks. Peserta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
