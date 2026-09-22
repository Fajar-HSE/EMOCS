import { z } from "zod"

export const trainerAssignmentSchema = z.object({
  trainer_id: z.string().uuid("Trainer wajib dipilih"),
  role: z.enum(["MAIN", "CO_TRAINER", "ASSESSOR", "BACKUP"]),
  fee: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
})
export type TrainerAssignmentInput = z.infer<typeof trainerAssignmentSchema>

export const venueBookingSchema = z.object({
  venue_id: z.string().uuid("Venue wajib dipilih"),
  estimated_cost: z.number().nonnegative().optional(),
  confirmation_number: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
})
export type VenueBookingInput = z.infer<typeof venueBookingSchema>

export const equipmentAssignmentSchema = z.object({
  equipment_id: z.string().uuid("Equipment wajib dipilih"),
  quantity: z.number().int().positive(),
})
export type EquipmentAssignmentInput = z.infer<typeof equipmentAssignmentSchema>
