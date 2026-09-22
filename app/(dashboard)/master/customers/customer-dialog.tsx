"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { customerSchema, type CustomerInput } from "@/lib/validations/master-data"
import { createCustomer, updateCustomer } from "@/actions/master-data-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

export type CustomerWithContact = {
  id: string
  name: string
  address: string | null
  phone: string | null
  npwp: string | null
  industry: string | null
  notes: string | null
  pic_name: string
  pic_title: string
  pic_phone: string
  pic_email: string
}

const EMPTY: CustomerInput = {
  name: "",
  address: "",
  phone: "",
  pic_name: "",
  pic_title: "",
  pic_phone: "",
  pic_email: "",
}

export function CustomerDialog({
  customer,
  onCreated,
}: {
  customer?: CustomerWithContact | null
  onCreated?: (c: { id: string; name: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isEdit = !!customer
  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        customer
          ? {
              name: customer.name,
              address: customer.address ?? "",
              phone: customer.phone ?? "",
              pic_name: customer.pic_name,
              pic_title: customer.pic_title,
              pic_phone: customer.pic_phone,
              pic_email: customer.pic_email,
            }
          : EMPTY
      )
    }
  }, [open, customer, form])

  async function onSubmit(values: CustomerInput) {
    // npwp/industry/notes tidak lagi di form — pertahankan nilai lama saat edit.
    const result = isEdit
      ? await updateCustomer(customer!.id, {
          ...values,
          npwp: customer!.npwp ?? "",
          industry: customer!.industry ?? "",
          notes: customer!.notes ?? "",
        })
      : await createCustomer(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan customer")
      return
    }
    toast.success(isEdit ? "Customer diperbarui" : "Customer baru tersimpan")
    if (!isEdit && onCreated && result.id) onCreated({ id: result.id, name: values.name })
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
            <Button size="sm">+ Tambah Customer</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Customer" : "Tambah Customer Baru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Perusahaan</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat Perusahaan</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Telepon Perusahaan</FormLabel>
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
                name="pic_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama PIC</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pic_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jabatan PIC</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pic_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon/WhatsApp PIC</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pic_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat Email PIC</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
