import { z } from "zod"

export const participantSchema = z.object({
  full_name: z.string().min(2, "Nama minimal 2 karakter").max(200),
  company_name: z.string().max(200).optional().or(z.literal("")),
  job_title: z.string().max(150).optional().or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  nik: z.string().max(20).optional().or(z.literal("")),
})
export type ParticipantInput = z.infer<typeof participantSchema>

// Billing per peserta (penggerak revenue event PUBLIC — sum unit_price yang
// CONFIRMED, Stage D). Kolom DB: unit_price nullable, billing_status default
// CONFIRMED, payment_status default UNPAID (0028_phase3_revenue.sql).
export const participantBillingSchema = z.object({
  unit_price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number({ error: "Harga harus berupa angka" }).nonnegative("Harga tidak boleh negatif").optional()
  ),
  billing_status: z.enum(["CONFIRMED", "CANCELLED", "WAIVED"]),
  payment_status: z.enum(["UNPAID", "INVOICED", "PARTIAL", "PAID"]),
})
export type ParticipantBillingInput = z.infer<typeof participantBillingSchema>
// Nilai form sebelum preprocess (unit_price datang sebagai string dari <Input>)
export type ParticipantBillingFormValues = z.input<typeof participantBillingSchema>

export const BILLING_STATUS_LABEL: Record<ParticipantBillingInput["billing_status"], string> = {
  CONFIRMED: "Ditagih",
  CANCELLED: "Batal",
  WAIVED: "Gratis",
}
export const PAYMENT_STATUS_LABEL: Record<ParticipantBillingInput["payment_status"], string> = {
  UNPAID: "Belum Bayar",
  INVOICED: "Terbit Invoice",
  PARTIAL: "Sebagian",
  PAID: "Lunas",
}
// Column headers we recognize when parsing a bulk-import CSV, matched
// case-insensitively — covers both English and the Indonesian labels an
// Ops person is more likely to type in Excel.
export const PARTICIPANT_CSV_HEADER_ALIASES: Record<keyof ParticipantInput, string[]> = {
  full_name: ["full_name", "nama", "nama lengkap", "name"],
  company_name: ["company_name", "perusahaan", "company"],
  job_title: ["job_title", "jabatan", "posisi", "title"],
  email: ["email", "e-mail"],
  phone: ["phone", "telepon", "no telepon", "no hp", "hp"],
  nik: ["nik"],
}
