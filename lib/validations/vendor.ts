import { z } from "zod"

export const vendorSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(200),
  category: z.string().max(100).optional().or(z.literal("")),
  contact_name: z.string().max(150).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, "Nomor HP tidak valid")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  npwp: z.string().max(30).optional().or(z.literal("")),
})
export type VendorInput = z.infer<typeof vendorSchema>
