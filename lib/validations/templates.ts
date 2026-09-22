import { z } from "zod"
import { EVENT_TYPES } from "./event"

export const checklistTemplateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(200),
  training_id: z.string().uuid().optional(),
  event_type: z.enum(EVENT_TYPES).optional(),
  delivery_mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).optional(),
  min_participants: z.number().int().nonnegative().optional(),
  max_participants: z.number().int().positive().optional(),
})
export type ChecklistTemplateInput = z.infer<typeof checklistTemplateSchema>

export const checklistTemplateItemSchema = z.object({
  category: z.string().max(100).optional().or(z.literal("")),
  label: z.string().min(2, "Label minimal 2 karakter").max(300),
  is_mandatory: z.boolean(),
})
export type ChecklistTemplateItemInput = z.infer<typeof checklistTemplateItemSchema>

export const taskTemplateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(200),
  event_type: z.enum(EVENT_TYPES).optional(),
  delivery_mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).optional(),
})
export type TaskTemplateInput = z.infer<typeof taskTemplateSchema>

export const taskTemplateItemSchema = z.object({
  title: z.string().min(2, "Judul minimal 2 karakter").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  days_before_event: z.number().int(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  is_mandatory: z.boolean(),
})
export type TaskTemplateItemInput = z.infer<typeof taskTemplateItemSchema>
