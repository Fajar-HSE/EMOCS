import { z } from "zod"

export const budgetItemSchema = z.object({
  cost_category_id: z.string().uuid("Kategori biaya wajib dipilih"),
  planned_amount: z.number().nonnegative("Nominal tidak boleh negatif"),
})
export type BudgetItemInput = z.infer<typeof budgetItemSchema>

export const budgetItemsSchema = z.array(budgetItemSchema).min(1, "Budget wajib punya minimal 1 item")
export type BudgetItemsInput = z.infer<typeof budgetItemsSchema>
