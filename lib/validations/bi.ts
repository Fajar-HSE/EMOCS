import { z } from "zod"

export const biFilterSchema = z.object({
  training_id: z.string().uuid().optional().or(z.literal("")),
  event_type: z.enum(["INHOUSE", "PUBLIC", "PRIVATE", "CUSTOM"]).optional().or(z.literal("")),
  delivery_mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).optional().or(z.literal("")),
  participant_count: z.number().min(1, "Minimal 1 peserta").default(10),
})

export type BiFilterInput = z.infer<typeof biFilterSchema>
