import { z } from "zod"

export const costCategorySchema = z.object({
  code: z.string().min(2, "Kode minimal 2 karakter").max(30),
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  sort_order: z.number().int().min(0).max(9999).optional(),
})
export type CostCategoryInput = z.infer<typeof costCategorySchema>
