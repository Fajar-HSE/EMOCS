"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { citySchema, type CityInput } from "@/lib/validations/master-data"
import { createCity, updateCity } from "@/actions/master-data-actions"
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

export type CityRow = {
  id: string
  name: string
  province: string | null
}

const EMPTY: CityInput = { name: "", province: "" }

export function CityDialog({ city }: { city?: CityRow | null }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isEdit = !!city
  const form = useForm<CityInput>({
    resolver: zodResolver(citySchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(city ? { name: city.name, province: city.province ?? "" } : EMPTY)
    }
  }, [open, city, form])

  async function onSubmit(values: CityInput) {
    const result = isEdit ? await updateCity(city!.id, values) : await createCity(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan kota")
      return
    }
    toast.success(isEdit ? "Kota diperbarui" : "Kota baru tersimpan")
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
            <Button size="sm">+ Kota baru</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Kota" : "Kota Baru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kota</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provinsi (opsional)</FormLabel>
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