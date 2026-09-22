"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { participantSchema, PARTICIPANT_CSV_HEADER_ALIASES, participantBillingSchema, BILLING_STATUS_LABEL, PAYMENT_STATUS_LABEL, type ParticipantInput, type ParticipantBillingInput, type ParticipantBillingFormValues } from "@/lib/validations/participant"
import {
  createParticipant,
  bulkCreateParticipants,
  deleteParticipant,
  updateParticipantBilling,
  recordAttendance,
  exportParticipants,
} from "@/actions/participant-actions"
import { parseCsv, toCsv, downloadCsv } from "@/lib/utils/csv"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const BILLING_STATUSES = ["CONFIRMED", "CANCELLED", "WAIVED"] as const
const PAYMENT_STATUSES = ["UNPAID", "INVOICED", "PARTIAL", "PAID"] as const

function formatIDR(value: number | null) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)
}

type Participant = {
  id: string
  full_name: string
  company_name: string | null
  job_title: string | null
  email: string | null
  phone: string | null
  registration_status: string
  unit_price: number | null
  billing_status: string
  payment_status: string
}
type AttendanceRecord = { participant_id: string; attendance_date: string; is_present: boolean }

export function ParticipantPanel({
  eventId,
  participants,
  attendance,
  defaultDate,
}: {
  eventId: string
  participants: Participant[]
  attendance: AttendanceRecord[]
  defaultDate: string
}) {
  const [date, setDate] = useState(defaultDate)
  const [pending, startTransition] = useTransition()

  const attendanceMap = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const a of attendance) if (a.attendance_date === date) m.set(a.participant_id, a.is_present)
    return m
  }, [attendance, date])

  function toggleAttendance(participantId: string, checked: boolean) {
    startTransition(async () => {
      const r = await recordAttendance(participantId, eventId, date, checked)
      if (!r.ok) toast.error(r.message ?? "Gagal mencatat kehadiran")
    })
  }

  async function handleExport() {
    const result = await exportParticipants(eventId)
    if (!result.ok || !result.rows) {
      toast.error(result.message ?? "Gagal mengekspor peserta")
      return
    }
    const csv = toCsv([
      ["Nama", "Perusahaan", "Jabatan", "Email", "Telepon", "Status Registrasi", "Status Sertifikat"],
      ...result.rows.map((r) => [
        r.full_name,
        r.company_name,
        r.job_title,
        r.email,
        r.phone,
        r.registration_status,
        r.certificate_status,
      ]),
    ])
    downloadCsv(`peserta-${eventId}.csv`, csv)
    toast.success(`${result.rows.length} peserta diekspor`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label className="mb-1.5">Tanggal Kehadiran</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={participants.length === 0}>
            Export CSV
          </Button>
          <ImportDialog eventId={eventId} />
          <AddParticipantDialog eventId={eventId} />
        </div>
      </div>

      <p className="text-muted-foreground text-sm">{participants.length} peserta terdaftar</p>

      {participants.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">Belum ada peserta.</p>
      )}

      {participants.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Perusahaan</TableHead>
              <TableHead>Kontak</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tagihan</TableHead>
                <TableHead>Hadir</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.full_name}
                  {p.job_title && <p className="text-muted-foreground text-xs">{p.job_title}</p>}
                </TableCell>
                <TableCell>{p.company_name ?? "—"}</TableCell>
                <TableCell>
                  {p.email ?? "—"}
                  {p.phone && <p className="text-muted-foreground text-xs">{p.phone}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{p.registration_status}</Badge>
                </TableCell>
                <TableCell>
                  <p className="font-medium tabular-nums">{formatIDR(p.unit_price)}</p>
                  <p className="text-muted-foreground text-xs">
                    {BILLING_STATUS_LABEL[p.billing_status as keyof typeof BILLING_STATUS_LABEL] ?? p.billing_status}
                    {" · "}
                    {PAYMENT_STATUS_LABEL[p.payment_status as keyof typeof PAYMENT_STATUS_LABEL] ?? p.payment_status}
                  </p>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={attendanceMap.get(p.id) ?? false}
                    onCheckedChange={(c) => toggleAttendance(p.id, !!c)}
                    disabled={pending}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <EditBillingDialog eventId={eventId} participant={p} />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await deleteParticipant(p.id, eventId)
                          if (!r.ok) toast.error(r.message ?? "Gagal menghapus")
                        })
                      }
                    >
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function AddParticipantDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const form = useForm<ParticipantInput>({
    resolver: zodResolver(participantSchema),
    defaultValues: { full_name: "", company_name: "", job_title: "", email: "", phone: "" },
  })

  async function onSubmit(values: ParticipantInput) {
    const result = await createParticipant(eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menambah peserta")
      return
    }
    toast.success("Peserta ditambahkan")
    form.reset({ full_name: "", company_name: "", job_title: "", email: "", phone: "" })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ Peserta</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Peserta</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="full_name"
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
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perusahaan</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jabatan</FormLabel>
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Telepon</FormLabel>
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
                Tambah
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function EditBillingDialog({ eventId, participant }: { eventId: string; participant: Participant }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const form = useForm<ParticipantBillingFormValues, unknown, ParticipantBillingInput>({
    resolver: zodResolver(participantBillingSchema),
    defaultValues: {
      unit_price: participant.unit_price ?? undefined,
      billing_status: (participant.billing_status ?? "CONFIRMED") as ParticipantBillingInput["billing_status"],
      payment_status: (participant.payment_status ?? "UNPAID") as ParticipantBillingInput["payment_status"],
    },
  })

  async function onSubmit(values: ParticipantBillingInput) {
    const result = await updateParticipantBilling(participant.id, eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan tagihan")
      return
    }
    toast.success("Tagihan peserta disimpan")
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost">Tagihan</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tagihan — {participant.full_name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="unit_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga per peserta (Rp)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      placeholder="cth. 500000"
                      value={field.value === undefined || field.value === null ? "" : String(field.value)}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billing_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Tagihan</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={BILLING_STATUSES.map((v) => ({ value: v, label: BILLING_STATUS_LABEL[v] }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BILLING_STATUSES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {BILLING_STATUS_LABEL[v]}
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
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Bayar</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={PAYMENT_STATUSES.map((v) => ({ value: v, label: PAYMENT_STATUS_LABEL[v] }))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {PAYMENT_STATUS_LABEL[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

function ImportDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ParticipantInput[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      const rows = parseCsv(text)
      if (rows.length < 2) {
        setParseError("File CSV kosong atau tidak memiliki baris data")
        setPreview(null)
        return
      }
      const header = rows[0].map((h) => h.trim().toLowerCase())
      const colIndex: Partial<Record<keyof ParticipantInput, number>> = {}
      for (const key of Object.keys(PARTICIPANT_CSV_HEADER_ALIASES) as (keyof ParticipantInput)[]) {
        const idx = header.findIndex((h) => PARTICIPANT_CSV_HEADER_ALIASES[key].includes(h))
        if (idx >= 0) colIndex[key] = idx
      }
      if (colIndex.full_name === undefined) {
        setParseError('Kolom "Nama" (atau "full_name") tidak ditemukan di header CSV')
        setPreview(null)
        return
      }

      const parsedRows: ParticipantInput[] = rows
        .slice(1)
        .map((r) => ({
          full_name: (r[colIndex.full_name!] ?? "").trim(),
          company_name: colIndex.company_name != null ? (r[colIndex.company_name] ?? "").trim() : "",
          job_title: colIndex.job_title != null ? (r[colIndex.job_title] ?? "").trim() : "",
          email: colIndex.email != null ? (r[colIndex.email] ?? "").trim() : "",
          phone: colIndex.phone != null ? (r[colIndex.phone] ?? "").trim() : "",
          nik: colIndex.nik != null ? (r[colIndex.nik] ?? "").trim() : "",
        }))
        .filter((r) => r.full_name.length > 0)

      if (parsedRows.length === 0) {
        setParseError("Tidak ada baris dengan nama yang valid")
        setPreview(null)
        return
      }
      setParseError(null)
      setPreview(parsedRows)
    }
    reader.readAsText(file)
  }

  async function handleConfirm() {
    if (!preview) return
    setImporting(true)
    const result = await bulkCreateParticipants(eventId, preview)
    setImporting(false)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal mengimpor peserta")
      return
    }
    toast.success(`${result.count} peserta diimpor`)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setPreview(null)
          setParseError(null)
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline">Import CSV</Button>} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Peserta dari CSV</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs">
            Header yang dikenali: Nama (wajib), Perusahaan, Jabatan, Email, Telepon, NIK. Ekspor
            dari Excel sebagai CSV lalu unggah di sini.
          </p>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          {parseError && <p className="text-destructive text-sm">{parseError}</p>}
          {preview && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Preview — {preview.length} baris ditemukan</p>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Perusahaan</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell>{r.company_name || "—"}</TableCell>
                        <TableCell>{r.email || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.length > 10 && (
                <p className="text-muted-foreground text-xs">...dan {preview.length - 10} baris lainnya</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button disabled={!preview || importing} onClick={handleConfirm}>
            {importing ? "Mengimpor..." : `Konfirmasi Import${preview ? ` (${preview.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
