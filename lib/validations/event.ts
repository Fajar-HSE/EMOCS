import { z } from "zod"

// Keputusan user 2026-09-15: tipe event disederhanakan jadi 4 pilihan.
// PRIVATE/CUSTOM = billing kontrak (setara INHOUSE); PUBLIC = per-peserta.
export const EVENT_TYPES = ["INHOUSE", "PUBLIC", "PRIVATE", "CUSTOM"] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  PUBLIC: "Public Training",
  INHOUSE: "Inhouse Training",
  PRIVATE: "Private Training",
  CUSTOM: "Custom Training",
}

// PRD §26.5: one schema, three places (client form, server action, TS type).
// Draft rows may be incomplete (wizard steps not all filled yet); submitEvent
// re-validates the FULL schema before allowing DRAFT -> SUBMITTED.
export const eventRequestSchema = z
  .object({
    // Step 1 — Customer
    customer_id: z.string().uuid("Customer wajib dipilih"),
    contact_id: z.string().uuid("Kontak wajib dipilih").optional(),

    // Step 2 — Event
    event_name: z.string().min(5, "Minimal 5 karakter").max(150),
    training_id: z.string().uuid("Program pelatihan wajib dipilih"),
    event_type: z.enum(EVENT_TYPES, "Pilih tipe event"),
    delivery_mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]),
    start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
    end_date: z.string().min(1, "Tanggal selesai wajib diisi"),
    start_time: z.string().optional().or(z.literal("")),
    end_time: z.string().optional().or(z.literal("")),
    location_type: z.enum(["CLIENT_SITE", "HOTEL", "OFFICE", "ONLINE", "OTHER"]),
    location_name: z.string().optional().or(z.literal("")),
    city_id: z.string().uuid().optional(),
    participant_count: z.number().int().min(1).max(1000),
    description: z.string().max(2000).optional().or(z.literal("")),
    special_requirements: z.string().max(2000).optional().or(z.literal("")),

    // Step 3 — Commercial
    sales_value: z.number().nonnegative().optional(),
    po_status: z.enum(["NO_PO", "PO_PENDING", "PO_RECEIVED", "VERBAL_COMMITMENT"]),
    po_number: z.string().optional().or(z.literal("")),
    payment_term: z.enum(["DP", "FULL_BEFORE", "NET_14", "NET_30", "OTHER"]).optional(),
    customer_reference: z.string().optional().or(z.literal("")),

    // Step 4 — Priority
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  })
  .refine((d) => new Date(d.end_date) >= new Date(d.start_date), {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["end_date"],
  })
  .refine((d) => d.delivery_mode === "ONLINE" || !!d.location_name, {
    message: "Lokasi wajib diisi",
    path: ["location_name"],
  })
  .refine((d) => d.delivery_mode === "ONLINE" || !!d.city_id, {
    message: "Kota wajib dipilih",
    path: ["city_id"],
  })
  .refine((d) => d.po_status !== "PO_RECEIVED" || !!d.po_number, {
    message: "Nomor PO wajib diisi",
    path: ["po_number"],
  })

export type EventRequestInput = z.infer<typeof eventRequestSchema>

// Draft: every field optional, no cross-field refinements (PRD §26.5).
export const eventDraftSchema = z.object({
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  event_name: z.string().max(150).optional(),
  training_id: z.string().uuid().optional(),
  event_type: z.enum(EVENT_TYPES).optional(),
  delivery_mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).optional(),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  start_time: z.string().optional().or(z.literal("")),
  end_time: z.string().optional().or(z.literal("")),
  location_type: z.enum(["CLIENT_SITE", "HOTEL", "OFFICE", "ONLINE", "OTHER"]).optional(),
  location_name: z.string().optional().or(z.literal("")),
  city_id: z.string().uuid().optional(),
  participant_count: z.number().int().min(1).max(1000).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  special_requirements: z.string().max(2000).optional().or(z.literal("")),
  sales_value: z.number().nonnegative().optional(),
  po_status: z.enum(["NO_PO", "PO_PENDING", "PO_RECEIVED", "VERBAL_COMMITMENT"]).optional(),
  po_number: z.string().optional().or(z.literal("")),
  payment_term: z.enum(["DP", "FULL_BEFORE", "NET_14", "NET_30", "OTHER"]).optional(),
  customer_reference: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
})
export type EventDraftInput = z.infer<typeof eventDraftSchema>
