import { z } from "zod"

export const customerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(200),
  npwp: z.string().max(30).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  phone: z.string().max(30, "Nomor telepon maksimal 30 karakter").optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  // PIC utama — opsional sebagai grup; bila salah satu diisi, nama PIC wajib.
  pic_name: z.string().max(150).optional().or(z.literal("")),
  pic_title: z.string().max(100).optional().or(z.literal("")),
  pic_phone: z
    .string()
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, "Nomor HP PIC tidak valid")
    .optional()
    .or(z.literal("")),
  pic_email: z.string().email("Format email PIC tidak valid").optional().or(z.literal("")),
}).refine(
  (d) => {
    const anyPic = [d.pic_name, d.pic_title, d.pic_phone, d.pic_email].some((v) => v && v.length > 0)
    return !anyPic || (d.pic_name !== undefined && d.pic_name.length >= 2)
  },
  { message: "Nama PIC minimal 2 karakter bila data PIC diisi", path: ["pic_name"] }
)
export type CustomerInput = z.infer<typeof customerSchema>

export const customerContactSchema = z.object({
  customer_id: z.string().uuid("Customer wajib dipilih"),
  full_name: z.string().min(2, "Nama minimal 2 karakter").max(150),
  job_title: z.string().max(100).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, "Nomor HP tidak valid")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  is_primary: z.boolean(),
})
export type CustomerContactInput = z.infer<typeof customerContactSchema>

export const trainingSchema = z.object({
  code: z.string().min(2, "Kode minimal 2 karakter").max(30),
  name: z.string().min(3, "Nama minimal 3 karakter").max(200),
  category: z.string().max(100).optional().or(z.literal("")),
  standard_duration_days: z.number().int().min(1).max(365).optional(),
  has_certification: z.boolean(),
})
export type TrainingInput = z.infer<typeof trainingSchema>

export const citySchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  province: z.string().max(100).optional().or(z.literal("")),
})
export type CityInput = z.infer<typeof citySchema>

export const trainerSchema = z.object({
  full_name: z.string().min(2, "Nama minimal 2 karakter").max(150),
  trainer_type: z.enum(["INTERNAL", "ASSOCIATE", "FREELANCE"]),
  city_id: z.string().uuid().optional(),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  rate_card: z.number().nonnegative().optional(),
  certification_name: z.string().max(150).optional().or(z.literal("")),
  certification_expires_at: z.string().optional().or(z.literal("")),
})
export type TrainerInput = z.infer<typeof trainerSchema>

export const venueSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(200),
  venue_type: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  city_id: z.string().uuid().optional(),
  capacity: z.number().int().positive().optional(),
  contact_name: z.string().max(150).optional().or(z.literal("")),
  contact_phone: z.string().max(30).optional().or(z.literal("")),
  reference_price: z.number().nonnegative().optional(),
})
export type VenueInput = z.infer<typeof venueSchema>

export const equipmentSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(150),
  category: z.string().max(100).optional().or(z.literal("")),
  total_quantity: z.number().int().positive(),
  notes: z.string().max(1000).optional().or(z.literal("")),
})
export type EquipmentInput = z.infer<typeof equipmentSchema>
