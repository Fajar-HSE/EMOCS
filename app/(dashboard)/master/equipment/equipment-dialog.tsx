"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { equipmentSchema, type EquipmentInput } from "@/lib/validations/master-data"
import { createEquipment, updateEquipment } from "@/actions/master-data-actions"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export type EquipmentRow = {
  id: string
  name: string
  category: string | null
  total_quantity: number
  notes: string | null
}

const EMPTY: EquipmentInput = {
  name: "",
  category: "",
  total_quantity: 1,
  notes: "",
}

export function EquipmentDialog({ equipment }: { equipment?: EquipmentRow | null }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isEdit = !!equipment
  const form = useForm<EquipmentInput>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        equipment
          ? {
              name: equipment.name,
              category: equipment.category ?? "",
              total_quantity: equipment.total_quantity,
              notes: equipment.notes ?? "",
            }
          : EMPTY
      )
    }
  }, [open, equipment, form])

  async function onSubmit(values: EquipmentInput) {
    const result = isEdit ? await updateEquipment(equipment!.id, values) : await createEquipment(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan equipment")
      return
    }
    toast.success(isEdit ? "Equipment diperbarui" : "Equipment baru tersimpan")
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
            <Button size="sm">+ Equipment baru</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Equipment" : "Equipment Baru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Proyektor, Sound, dll" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Tersedia</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? 1}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan (opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
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