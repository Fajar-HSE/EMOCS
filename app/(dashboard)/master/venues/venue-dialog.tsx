"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { venueSchema, type VenueInput } from "@/lib/validations/master-data"
import { createVenue, updateVenue } from "@/actions/master-data-actions"
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

export type VenueRow = {
  id: string
  name: string
  venue_type: string | null
  address: string | null
  city_id: string | null
  capacity: number | null
  contact_name: string | null
  contact_phone: string | null
  reference_price: number | null
}

const EMPTY: VenueInput = {
  name: "",
  venue_type: "",
  address: "",
  city_id: undefined,
  capacity: undefined,
  contact_name: "",
  contact_phone: "",
  reference_price: undefined,
}

export function VenueDialog({
  cities,
  venue,
}: {
  cities: { id: string; name: string }[]
  venue?: VenueRow | null
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isEdit = !!venue
  const form = useForm<VenueInput>({
    resolver: zodResolver(venueSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        venue
          ? {
              name: venue.name,
              venue_type: venue.venue_type ?? "",
              address: venue.address ?? "",
              city_id: venue.city_id ?? undefined,
              capacity: venue.capacity ?? undefined,
              contact_name: venue.contact_name ?? "",
              contact_phone: venue.contact_phone ?? "",
              reference_price: venue.reference_price ?? undefined,
            }
          : EMPTY
      )
    }
  }, [open, venue, form])

  async function onSubmit(values: VenueInput) {
    const result = isEdit ? await updateVenue(venue!.id, values) : await createVenue(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan venue")
      return
    }
    toast.success(isEdit ? "Venue diperbarui" : "Venue baru tersimpan")
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
            <Button size="sm">+ Venue baru</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Venue" : "Venue Baru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Venue</FormLabel>
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
                name="venue_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Hotel, Kantor, dll" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kota</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={cities.map((c) => ({ value: c.id, label: c.name }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih kota" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
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
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapasitas</FormLabel>
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
                name="reference_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Acuan (IDR)</FormLabel>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontak PIC</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telepon PIC</FormLabel>
                    <FormControl>
                      <Input {...field} />
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