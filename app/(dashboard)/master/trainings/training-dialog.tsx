"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { trainingSchema, type TrainingInput } from "@/lib/validations/master-data"
import { createTraining, updateTraining } from "@/actions/master-data-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export type TrainingRow = {
  id: string
  code: string
  name: string
  category: string | null
  standard_duration_days: number | null
  has_certification: boolean
}

const EMPTY: TrainingInput = {
  code: "",
  name: "",
  category: "",
  standard_duration_days: undefined,
  has_certification: false,
}

export function TrainingDialog({ training }: { training?: TrainingRow | null }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isEdit = !!training
  const form = useForm<TrainingInput>({
    resolver: zodResolver(trainingSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        training
          ? {
              code: training.code,
              name: training.name,
              category: training.category ?? "",
              standard_duration_days: training.standard_duration_days ?? undefined,
              has_certification: training.has_certification,
            }
          : EMPTY
      )
    }
  }, [open, training, form])

  async function onSubmit(values: TrainingInput) {
    const result = isEdit ? await updateTraining(training!.id, values) : await createTraining(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan training")
      return
    }
    toast.success(isEdit ? "Training diperbarui" : "Training/program baru tersimpan")
    form.reset(EMPTY)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button size="sm" variant="ghost">
              Ubah
            </Button>
          ) : (
            <Button size="sm">+ Training baru</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Training/Program" : "Training/Program Baru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="mis. K3-DASAR" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Program</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori (opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="standard_duration_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durasi Standar (hari)</FormLabel>
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
            <FormField
              control={form.control}
              name="has_certification"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Menghasilkan sertifikasi</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}