"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const supabaseClient = createClient()
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { eventDraftSchema, EVENT_TYPES, EVENT_TYPE_LABELS, type EventDraftInput } from "@/lib/validations/event"
import {
  DELIVERY_MODE_LABELS,
  LOCATION_TYPE_LABELS,
  PAYMENT_TERM_LABELS,
  PO_STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/validations/labels"
import { formatDate } from "@/lib/utils/format"
import { updateEventDraft, submitEvent } from "@/actions/event-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"
import { CustomerSearchSelect } from "@/components/shared/customer-search-select"
import { CustomerDialog } from "@/app/(dashboard)/master/customers/customer-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { Database } from "@/types/database.types"

type EventRow = Database["public"]["Tables"]["events"]["Row"]

const STEPS = ["Customer & Kontak", "Detail Event", "Komersial & PO", "Review & Submit"] as const

function formatRupiah(value: number | undefined): string {
  if (value == null) return ""
  return "Rp " + value.toLocaleString("id-ID")
}

function parseRupiah(raw: string): { display: string; value: number | undefined } {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
  if (!digits) return { display: "", value: undefined }
  return { display: "Rp " + digits.replace(/\B(?=(\d{3})+(?!\d))/g, "."), value: Number(digits) }
}

export function EventWizard({
  draftId,
  initialEvent,
  customers,
  trainings,
  cities,
}: {
  draftId: string
  initialEvent: EventRow
  customers: { id: string; name: string }[]
  trainings: { id: string; name: string }[]
  cities: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState<{ id: string; full_name: string; phone?: string | null; email?: string | null }[]>([])
  const [contactLoading, setContactLoading] = useState(false)
  const [customerOptions, setCustomerOptions] = useState(customers)
  const [step, setStep] = useState(0)
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string
    event_code: string | null
    event_name: string
  } | null>(null)

  const form = useForm<EventDraftInput>({
    resolver: zodResolver(eventDraftSchema),
    defaultValues: {
      customer_id: initialEvent.customer_id ?? undefined,
      contact_id: initialEvent.contact_id ?? undefined,
      event_name: initialEvent.event_name === "(Draft belum diberi nama)" ? "" : initialEvent.event_name,
      training_id: initialEvent.training_id ?? undefined,
      event_type: initialEvent.event_type ?? undefined,
      delivery_mode: initialEvent.delivery_mode ?? undefined,
      start_date: initialEvent.start_date ?? "",
      end_date: initialEvent.end_date ?? "",
      start_time: initialEvent.start_time ?? "",
      end_time: initialEvent.end_time ?? "",
      location_type: initialEvent.location_type ?? undefined,
      location_name: initialEvent.location_name ?? "",
      city_id: initialEvent.city_id ?? undefined,
      participant_count: initialEvent.participant_count ?? undefined,
      description: initialEvent.description ?? "",
      special_requirements: initialEvent.special_requirements ?? "",
      sales_value: initialEvent.sales_value ?? undefined,
      po_status: initialEvent.po_status ?? "NO_PO",
      po_number: initialEvent.po_number ?? "",
      payment_term: initialEvent.payment_term ?? undefined,
      customer_reference: initialEvent.customer_reference ?? "",
      priority: initialEvent.priority ?? "NORMAL",
    },
  })

  // Watch semua field penentu validitas step agar parent re-render dan flag
  // stepXValid selalu fresh. (RHF Controller hanya me-render ulang field-nya
  // sendiri — tanpa watch, getValues() di body render akan basi dan tombol
  // Lanjut terkunci selamanya.)
  const customerId = form.watch("customer_id")

  // Customer baru dibuat inline di langkah Customer — langsung masuk daftar
  // opsi dan terpilih, agar Sales tidak perlu keluar dari wizard.
  function handleCustomerCreated(c: { id: string; name: string }) {
    setCustomerOptions((prev) =>
      prev.some((o) => o.id === c.id) ? prev : [...prev, c]
    )
    form.setValue("customer_id", c.id, { shouldValidate: true })
  }

  const deliveryMode = form.watch("delivery_mode")
  const startDate = form.watch("start_date")
  const eventName = form.watch("event_name")
  const trainingId = form.watch("training_id")
  const eventType = form.watch("event_type")
  const salesValue = form.watch("sales_value")
  const paymentTerm = form.watch("payment_term")

  // Subskribe seluruh isi form agar layar Review (step 3) selalu segar.
  const values = form.watch()

  const isRush = useMemo(() => {
    if (!startDate) return false
    const diffDays = (new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diffDays < 7
  }, [startDate])

  // Auto-load contacts when customer changes
  // Auto-load contacts when customer changes
  useEffect(() => {
    if (customerId) {
      setContactLoading(true)
      // Reset contact_id immediately when customer changes
      form.setValue("contact_id", undefined)
      Promise.resolve(
        supabaseClient
          .from("customer_contacts")
          .select("id, full_name, phone, email")
          .eq("customer_id", customerId)
          .eq("is_primary", true)
          .is("deleted_at", null)
      )
        .then(({ data }) => {
          setContacts(data ?? [])
        })
        .finally(() => setContactLoading(false))
    } else {
      setContacts([])
      setContactLoading(false)
      form.setValue("contact_id", undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  // Set default contact_id after contacts are loaded
  useEffect(() => {
    if (contacts.length > 0) {
      const primary = contacts[0]
      if (primary) {
        form.setValue("contact_id", primary.id)
      }
    } else if (contacts.length === 0 && customerId) {
      form.setValue("contact_id", undefined)
    }
  }, [contacts, customerId])

  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    saveTimer.current = setInterval(() => {
      void saveDraft(true)
    }, 30_000)
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveDraft(silent = false) {
    const values = form.getValues()
    const result = await updateEventDraft(draftId, values)
    if (!result.ok && !silent) {
      toast.error(result.message ?? "Gagal menyimpan draft")
    } else if (!silent) {
      toast.success("Draft tersimpan")
    }
    return result
  }

  const step0Valid = !!customerId
  const step1Valid = !!eventName && !!trainingId && !!eventType && !!startDate
  const step2Valid = !!salesValue && !!paymentTerm

  function stepHasMissingFields(): boolean {
    switch (step) {
      case 0:
        return !step0Valid
      case 1:
        return !step1Valid
      case 2:
        return !step2Valid
      default:
        return false
    }
  }

  async function goNext() {
    await saveDraft(true)
    // Baca fresh dari form saat klik (jangan andalkan closure render).
    const v = form.getValues()
    const s0 = !!v.customer_id
    const s1 = !!v.event_name && !!v.training_id && !!v.event_type && !!v.start_date
    const s2 = !!v.sales_value && !!v.payment_term
    const required = [
      [step === 0, !s0, "Customer belum dipilih"],
      [step === 1, !s1, "Nama event / program / tipe event wajib diisi"],
      [step === 2, !s2, "Nilai jual dan termin pembayaran wajib diisi"],
    ]
    const missing = required.find(([active, missing, msg]) => active && missing)
    if (missing) {
      toast.error(missing[2] as string)
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit(confirmDuplicate = false) {
    await saveDraft(true)
    const result = await submitEvent(draftId, confirmDuplicate)

    if (result.duplicateOf) {
      setDuplicateWarning(result.duplicateOf)
      return
    }
    if (!result.ok) {
      toast.error(result.message ?? "Gagal submit event")
      return
    }
    if (!result.id) {
      router.push("/events")
      return
    }
    router.push(`/events/${result.id}?created=1`)
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-2">
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <div className="flex flex-wrap justify-between gap-2 text-xs">
          {STEPS.map((label, i) => (
            <span key={label} className={i === step ? "text-foreground font-medium" : "text-muted-foreground"}>
              {i + 1}. {label}
            </span>
          ))}
        </div>
      </div>

      {isRush && (
        <Alert>
          <AlertDescription>
            ⚡ Event ini kurang dari H-7. Akan ditandai <strong>RUSH</strong> dan prioritas review Ops Manager dinaikkan.
          </AlertDescription>
        </Alert>
      )}

      {duplicateWarning && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-2">
            <span>
              Kemungkinan duplikat: <strong>{duplicateWarning.event_code}</strong> — {duplicateWarning.event_name}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDuplicateWarning(null)}>
                Batal
              </Button>
              <Button size="sm" onClick={() => handleSubmit(true)}>
                Tetap lanjutkan
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        {step === 0 && (
          <>
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <CustomerSearchSelect
                    key={field.value ?? "empty"}
                    value={field.value ?? null}
                    onChange={(id) => field.onChange(id)}
                    options={customerOptions.map((c) => ({ id: c.id, label: c.name }))}
                    placeholder="Cari atau pilih customer..."
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <CustomerDialog onCreated={handleCustomerCreated} />
                    <span className="text-xs text-muted-foreground">
                      Customer tidak ada di daftar? Buat langsung.
                    </span>
                  </div>
                  <FormMessage />
                  {customers.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Belum ada customer. Buat di menu <a href="/master/customers" className="underline">Customers</a>.
                    </p>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kontak PIC Customer (Kontak Customer / PIC Operasional)</FormLabel>
                  <Select
                    value={
                      contactLoading || !contacts.some((c) => c.id === field.value)
                        ? ""
                        : (field.value ?? "")
                    }
                    onValueChange={field.onChange}
                    disabled={!customerId || contactLoading}
                    items={contacts.map((c) => ({
                      value: c.id,
                      label: c.phone ? `${c.full_name} (${c.phone})` : c.full_name,
                    }))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            contactLoading
                              ? "Memuat kontak..."
                              : customerId
                              ? "Pilih kontak customer..."
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
                  {!customerId && !contactLoading && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Buat customer terlebih dahulu.
                    </p>
                  )}
                </FormItem>
              )}
            />
          </>
        )}

        {step === 1 && (
          <>
            <FormField
              control={form.control}
              name="event_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Event</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    items={trainings.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih program" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trainings.map((t) => (
                        <SelectItem key={t.id} value={t.id} label={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          <SelectValue placeholder="Pilih" />
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
                    <FormLabel>Delivery Mode</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={["OFFLINE", "ONLINE", "HYBRID"].map((v) => ({
                        value: v,
                        label: DELIVERY_MODE_LABELS[v as keyof typeof DELIVERY_MODE_LABELS],
                      }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["OFFLINE", "ONLINE", "HYBRID"].map((v) => (
                          <SelectItem
                            key={v}
                            value={v}
                            label={DELIVERY_MODE_LABELS[v as keyof typeof DELIVERY_MODE_LABELS]}
                          >
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Mulai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="location_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Lokasi</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => {
                        field.onChange(v)
                        if (v === "ONLINE") {
                          form.setValue("city_id", undefined)
                          form.setValue("location_name", "")
                        }
                      }}
                      items={(
                        ["CLIENT_SITE", "HOTEL", "OFFICE", "ONLINE", "OTHER"] as const
                      ).map((v) => ({ value: v, label: LOCATION_TYPE_LABELS[v] }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CLIENT_SITE" label="Lokasi Klien">Lokasi Klien</SelectItem>
                        <SelectItem value="HOTEL" label="Hotel">Hotel</SelectItem>
                        <SelectItem value="OFFICE" label="Kantor Kami">Kantor Kami</SelectItem>
                        <SelectItem value="ONLINE" label="Online">Online</SelectItem>
                        <SelectItem value="OTHER" label="Lainnya">Lainnya</SelectItem>
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
                    <Select
                      value={
                        cities.some((c) => c.id === field.value) ? (field.value ?? "") : ""
                      }
                      onValueChange={field.onChange}
                      disabled={deliveryMode === "ONLINE"}
                      items={cities.map((c) => ({ value: c.id, label: c.name }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih kota" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id} label={c.name}>
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
            {deliveryMode !== "ONLINE" && (
              <FormField
                control={form.control}
                name="location_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lokasi</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nama gedung/ruangan" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jam Mulai</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
          </>
        )}

        {step === 2 && (
          <>
            <FormField
              control={form.control}
              name="sales_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nilai Jual</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Rp 0"
                      value={field.value != null ? formatRupiah(field.value) : ""}
                      onChange={(e) => {
                        const parsed = parseRupiah(e.target.value)
                        field.onChange(parsed.value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="po_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status PO</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={(
                        ["NO_PO", "PO_PENDING", "PO_RECEIVED", "VERBAL_COMMITMENT"] as const
                      ).map((v) => ({ value: v, label: PO_STATUS_LABELS[v] }))}
                    >
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
                name="payment_term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termin Pembayaran</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      items={(["DP", "FULL_BEFORE", "NET_14", "NET_30", "OTHER"] as const).map(
                        (v) => ({ value: v, label: PAYMENT_TERM_LABELS[v] })
                      )}
                    >
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
            </div>
            <FormField
              control={form.control}
              name="po_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No. PO (opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customer_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referensi Customer (opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    items={(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((v) => ({
                      value: v,
                      label: PRIORITY_LABELS[v],
                    }))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW" label="Rendah">Rendah</SelectItem>
                      <SelectItem value="NORMAL" label="Normal">Normal</SelectItem>
                      <SelectItem value="HIGH" label="Tinggi">Tinggi</SelectItem>
                      <SelectItem value="URGENT" label="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {step === 3 && (
          <>{
            (() => {
              const customerName = values.customer_id
                ? customers.find((c) => c.id === values.customer_id)?.name
                : ""
              const contactName = values.contact_id
                ? contacts.find((c) => c.id === values.contact_id)?.full_name
                : ""
              const training = values.training_id
                ? trainings.find((t) => t.id === values.training_id)
                : undefined
              const cityName = values.city_id
                ? cities.find((c) => c.id === values.city_id)?.name
                : ""
              const dateRange = [
                values.start_date ? formatDate(values.start_date) : null,
                values.end_date ? formatDate(values.end_date) : null,
              ]
                .filter(Boolean)
                .join(" s/d ")
              const timeRange = [values.start_time, values.end_time].filter(Boolean).join("–")
              const poNumber = values.po_number ? ` (${values.po_number})` : ""
              const locationName = values.location_name ? ` · ${values.location_name}` : ""
              const locationCity = cityName ? ` · ${cityName}` : ""

              const rows: { label: string; value: string }[] = [
                { label: "Customer", value: customerName || "—" },
                { label: "Kontak", value: contactName || "—" },
                {
                  label: "Program",
                  value: training ? training.name : "—",
                },
                {
                  label: "Tipe Event",
                  value: values.event_type ? EVENT_TYPE_LABELS[values.event_type] : "—",
                },
                {
                  label: "Delivery Mode",
                  value: values.delivery_mode
                    ? DELIVERY_MODE_LABELS[values.delivery_mode]
                    : "—",
                },
                { label: "Tanggal", value: [dateRange, timeRange].filter(Boolean).join(" · ") || "—" },
                {
                  label: "Lokasi",
                  value: values.location_type
                    ? `${LOCATION_TYPE_LABELS[values.location_type]}${locationName}${locationCity}`
                    : "—",
                },
                {
                  label: "Jumlah Peserta",
                  value: values.participant_count != null ? String(values.participant_count) : "—",
                },
                { label: "Nilai Jual", value: formatRupiah(values.sales_value) || "—" },
                {
                  label: "Status PO",
                  value: values.po_status
                    ? `${PO_STATUS_LABELS[values.po_status]}${poNumber}`
                    : "—",
                },
                {
                  label: "Termin Pembayaran",
                  value: values.payment_term ? PAYMENT_TERM_LABELS[values.payment_term] : "—",
                },
                {
                  label: "Referensi Customer",
                  value: values.customer_reference || "—",
                },
                {
                  label: "Prioritas",
                  value: values.priority ? PRIORITY_LABELS[values.priority] : "—",
                },
              ]

              return (
                <div className="rounded-lg border p-4">
                  <h2 className="mb-3 text-sm font-semibold">Ringkasan Event Request</h2>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    {rows.map((row) => (
                      <div key={row.label} className="grid grid-cols-[98px_1fr] gap-2">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="text-foreground font-medium">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )
            })()
          }
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan (opsional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </form>

      <div className="flex justify-between gap-3 pt-3">
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={goBack}>
              Kembali
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => saveDraft(false)}>
            Simpan Draft
          </Button>
        </div>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext} className={stepHasMissingFields() ? "bg-amber-500 hover:bg-amber-600 text-amber-50 ring-2 ring-amber-500" : ""}>
            <span className="flex items-center gap-1.5">
              Lanjut
              {stepHasMissingFields() && <AlertTriangle className="h-4 w-4" />}
            </span>
          </Button>
        ) : (
          <Button type="button" onClick={() => handleSubmit(false)} disabled={form.formState.isSubmitting}>
            Submit Event Request
          </Button>
        )}
      </div>
    </Form>
  )
}
