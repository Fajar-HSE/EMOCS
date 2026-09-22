import { z } from "zod"

export const CHANGE_REQUEST_FIELDS = [
  { value: "start_date", label: "Tanggal Mulai", type: "date" },
  { value: "end_date", label: "Tanggal Selesai", type: "date" },
  { value: "location_name", label: "Nama Lokasi", type: "text" },
  { value: "participant_count", label: "Jumlah Peserta", type: "number" },
  { value: "training_id", label: "Program Training", type: "training" },
] as const

export type ChangeRequestField = (typeof CHANGE_REQUEST_FIELDS)[number]["value"]

export const changeRequestSchema = z.object({
  field_name: z.enum(["start_date", "end_date", "location_name", "participant_count", "training_id"]),
  new_value: z.string().min(1, "Nilai baru wajib diisi"),
  reason: z.string().min(5, "Alasan minimal 5 karakter"),
  cost_impact_note: z.string().max(1000).optional().or(z.literal("")),
})
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>
