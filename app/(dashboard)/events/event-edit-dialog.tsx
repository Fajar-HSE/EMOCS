"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { eventDraftSchema, EVENT_TYPES, EVENT_TYPE_LABELS, type EventDraftInput } from "@/lib/validations/event"
import {
  DELIVERY_MODE_LABELS,
  LOCATION_TYPE_LABELS,
  PRIORITY_LABELS,
} from "@/lib/validations/labels"
import { updateEventDetails } from "@/actions/event-actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CustomerSearchSelect } from "@/components/shared/customer-search-select"

// Field yang bisa diubah manajemen dari Daftar Event tanpa menyentuh status.
export type EventEditRow = {
  id: string
  sales_team_id: string | null
} & { [K in keyof Omit<EventDraftInput, "id" | "sales_team_id">]: EventDraftInput[K] | null }

type Contact = { id: string; full_name: string; phone: string | null }

export function EventEditDialog({ event, disabled }: { event: EventEditRow; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactLoading, setContactLoading] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [trainings, setTrainings] = useState<{ id: string; name: string; code: string }[]>([])
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  // State lokal (bukan form.watch) agar tidak memicu react-hooks/incompatible-library.
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [deliveryMode, setDeliveryMode] = useState<EventDraftInput["delivery_mode"] | null>(null)
  const router = useRouter()

  const form = useForm<EventDraftInput>({
    resolver: zodResolver(eventDraftSchema),
    defaultValues: {},
  })

  function defaults(): EventDraftInput {
    return {
      customer_id: event.customer_id ?? undefined,
      contact_id: event.contact_id ?? undefined,
      event_name: event.event_name ?? "",
      training_id: event.training_id ?? undefined,
      event_type: event.event_type ?? undefined,
      delivery_mode: event.delivery_mode ?? undefined,
      start_date: event.start_date ?? "",
      end_date: event.end_date ?? "",
      start_time: event.start_time ?? "",
      end_time: event.end_time ?? "",
      location_type: event.location_type ?? undefined,
      location_name: event.location_name ?? "",
      city_id: event.city_id ?? undefined,
      participant_count: event.participant_count ?? undefined,
      description: event.description ?? "",
      special_requirements: event.special_requirements ?? "",
      sales_value: event.sales_value ?? undefined,
      po_status: event.po_status ?? "NO_PO",
      po_number: event.po_number ?? "",
      payment_term: event.payment_term ?? undefined,
      customer_reference: event.customer_reference ?? "",
      priority: event.priority ?? "NORMAL",
    }
  }

  // Muat daftar opsi (customer/training/kota) sekali saat dialog dibuka.
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    form.reset(defaults())
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCustomerId(event.customer_id ?? "")
    setDeliveryMode(event.delivery_mode ?? null)
    Promise.all([
      supabase.from("customers").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("trainings").select("id, name, code").is("deleted_at", null).order("name"),
      supabase.from("cities").select("id, name").is("deleted_at", null).order("name"),
    ]).then(([c, t, ct]) => {
      setCustomers(c.data ?? [])
      setTrainings(t.data ?? [])
      setCities(ct.data ?? [])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const customerId = selectedCustomerId

  // Auto-load kontak PIC saat customer berubah (sama seperti wizard).
  useEffect(() => {
    if (!customerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContacts([])
      setContactLoading(false)
      form.setValue("contact_id", undefined)
      return
    }
    setContactLoading(true)
    form.setValue("contact_id", undefined)
    const supabase = createClient()
    Promise.resolve(
      supabase
        .from("customer_contacts")
        .select("id, full_name, phone")
        .eq("customer_id", customerId)
        .eq("is_primary", true)
        .is("deleted_at", null)
    )
      .then(({ data }) => setContacts(data ?? []))
      .finally(() => setContactLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  useEffect(() => {
    if (contacts.length > 0 && !form.getValues("contact_id")) {
      form.setValue("contact_id", contacts[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts])

  async function onSubmit(values: EventDraftInput) {
    const result = await updateEventDetails(event.id, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal mengubah event")
      return
    }
    toast.success("Event diperbarui")
    setOpen(false)
    router.refresh()
    router.prefetch(`/events/${event.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={(e) => e.stopPropagation()}
        render={
          <Button size="sm" variant="ghost" disabled={disabled}>
            Ubah
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Event</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
            <p className="text-muted-foreground text-sm">
              Mengubah detail event <span className="font-medium text-foreground">{event.event_name || "(tanpa nama)"}</span>. Perubahan langsung tersimpan tanpa mengubah status.
            </p>

            <FormField
              control={form.control}
              name="event_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Event</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <CustomerSearchSelect
                      value={field.value}
                      onChange={(id) => {
                        field.onChange(id)
                        setSelectedCustomerId(id)
                      }}
                      options={customers.map((c) => ({ id: c.id, label: c.name }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontak PIC</FormLabel>
                    <Select
                      value={contactLoading || !contacts.some((c) => c.id === field.value) ? "" : (field.value ?? "")}
                      onValueChange={field.onChange}
                      disabled={!customerId || contactLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              contactLoading
                                ? "Memuat kontak..."
                                : customerId
                                  ? "Pilih kontak..."
                                  : "Pilih customer dulu"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contactLoading ? (
                          <SelectItem value="__loading__" disabled>
                            Memuat kontak...
                          </SelectItem>
                        ) : contacts.length === 0 ? (
                          <SelectItem value="__empty__" disabled>
                            Belum ada kontak (PIC utama belum di-set)
                          </SelectItem>
                        ) : (
                          contacts.map((c) => (
                            <SelectItem key={c.id} value={c.id} label={c.full_name}>
                              {c.full_name} {c.phone ? `(${c.phone})` : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="training_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Pelatihan</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trainings.length === 0 ? (
                          <SelectItem value="__empty__" disabled>
                            Memuat...
                          </SelectItem>
                        ) : (
                          trainings.map((t) => (
                            <SelectItem key={t.id} value={t.id} label={`${t.code} — ${t.name}`}>
                              {t.code} — {t.name}
                            </SelectItem>
                          ))
                        )}
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
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Event</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih tipe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_TYPES.map((v) => (
                          <SelectItem key={v} value={v} label={EVENT_TYPE_LABELS[v]}>
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
                    <FormLabel>Mode Pelaksanaan</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => {
                        field.onChange(v)
                        setDeliveryMode(v as EventDraftInput["delivery_mode"] | null)
                        if (v === "ONLINE" && !form.getValues("location_type")) {
                          form.setValue("location_type", "ONLINE")
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["OFFLINE", "ONLINE", "HYBRID"] as const).map((v) => (
                          <SelectItem key={v} value={v} label={DELIVERY_MODE_LABELS[v]}>
                            {DELIVERY_MODE_LABELS[v]}
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
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Mulai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Selesai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jam Mulai</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jam Selesai</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Lokasi</FormLabel>
                    <Select
                      value={deliveryMode === "ONLINE" && !field.value ? "ONLINE" : (field.value ?? "")}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih lokasi" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["CLIENT_SITE", "HOTEL", "OFFICE", "ONLINE", "OTHER"] as const).map((v) => (
                          <SelectItem key={v} value={v} label={LOCATION_TYPE_LABELS[v]}>
                            {LOCATION_TYPE_LABELS[v]}
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
                name="city_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kota</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih kota" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.length === 0 ? (
                          <SelectItem value="__empty__" disabled>
                            Memuat...
                          </SelectItem>
                        ) : (
                          cities.map((c) => (
                            <SelectItem key={c.id} value={c.id} label={c.name}>
                              {c.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location_name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama Lokasi</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Nama venue / hotel / link meeting" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="participant_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Peserta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sales_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nilai Jual (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
                name="po_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status PO</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NO_PO" label="Tanpa PO">Tanpa PO</SelectItem>
                        <SelectItem value="PO_PENDING" label="PO dalam Proses">PO dalam Proses</SelectItem>
                        <SelectItem value="PO_RECEIVED" label="PO Diterima">PO Diterima</SelectItem>
                        <SelectItem value="VERBAL_COMMITMENT" label="Komitmen Verbal">Komitmen Verbal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="po_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor PO</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termin Pembayaran</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DP" label="Uang Muka (DP)">Uang Muka (DP)</SelectItem>
                        <SelectItem value="FULL_BEFORE" label="Bayar di Muka">Bayar di Muka</SelectItem>
                        <SelectItem value="NET_14" label="Net 14 Hari">Net 14 Hari</SelectItem>
                        <SelectItem value="NET_30" label="Net 30 Hari">Net 30 Hari</SelectItem>
                        <SelectItem value="OTHER" label="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customer_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referensi Customer</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioritas</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih prioritas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((v) => (
                        <SelectItem key={v} value={v} label={PRIORITY_LABELS[v]}>
                          {PRIORITY_LABELS[v]}
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
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="special_requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kebutuhan Khusus</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}