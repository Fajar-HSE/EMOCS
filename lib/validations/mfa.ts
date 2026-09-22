import { z } from "zod"

export const mfaCodeSchema = z.object({
  factorId: z.string().uuid(),
  code: z
    .string()
    .length(6, "Kode harus 6 digit")
    .regex(/^\d{6}$/, "Kode harus berupa 6 angka"),
})
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>
