import { z } from "zod"

export const taskSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  assignee_user_id: z.string().uuid("Penanggung jawab wajib dipilih"),
  due_date: z.string().min(1, "Tenggat wajib diisi"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  is_mandatory: z.boolean(),
})
export type TaskInput = z.infer<typeof taskSchema>
