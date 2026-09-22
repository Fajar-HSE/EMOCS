import { z } from "zod"

export const issueSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(200),
  category: z.enum([
    "TRAINER",
    "VENUE",
    "PARTICIPANT",
    "EQUIPMENT",
    "MATERIAL",
    "CUSTOMER",
    "LOGISTIC",
    "FINANCE",
    "OTHER",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().max(2000).optional().or(z.literal("")),
  assignee_user_id: z.string().uuid().optional(),
  due_date: z.string().optional().or(z.literal("")),
})
export type IssueInput = z.infer<typeof issueSchema>
