import { z } from "zod"

export const approvalThresholdSchema = z
  .object({
    context: z.enum(["EXPENSE", "BUDGET"]),
    approver_role: z.enum(["OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "MANAGEMENT", "ADMIN"]),
    min_amount: z.number().nonnegative("Batas bawah tidak boleh negatif"),
    max_amount: z.number().positive().optional(),
    sort_order: z.number().int().min(1, "Urutan minimal 1").max(99),
  })
  .refine((data) => data.max_amount === undefined || data.max_amount > data.min_amount, {
    message: "Batas atas harus lebih besar dari batas bawah",
    path: ["max_amount"],
  })
export type ApprovalThresholdInput = z.infer<typeof approvalThresholdSchema>
