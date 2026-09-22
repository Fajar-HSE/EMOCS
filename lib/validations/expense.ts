import { z } from "zod"

export const expensePaymentMethods = ["CASH_ADVANCE", "REIMBURSEMENT", "TRANSFER", "COMPANY_CARD"] as const

export const expenseSchema = z.object({
  cost_category_id: z.string().uuid("Kategori biaya wajib dipilih"),
  vendor_id: z.string().uuid().optional(),
  vendor_name: z.string().max(200).optional().or(z.literal("")),
  description: z.string().min(3, "Deskripsi minimal 3 karakter").max(500),
  amount: z.number().positive("Nominal wajib lebih dari 0"),
  expense_date: z.string().min(1, "Tanggal expense wajib diisi"),
  payment_method: z.enum(expensePaymentMethods),
  receipt_document_id: z.string().uuid().optional(),
  justification_note: z.string().max(1000).optional().or(z.literal("")),
})
export type ExpenseInput = z.infer<typeof expenseSchema>
