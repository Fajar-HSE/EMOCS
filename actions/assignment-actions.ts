"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/session"
import {
  trainerAssignmentSchema,
  venueBookingSchema,
  equipmentAssignmentSchema,
} from "@/lib/validations/assignment"

export type AssignmentActionResult = { ok: boolean; message?: string; warning?: string }

function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && aEnd >= bStart
}

// FR: assigning a trainer/venue already committed elsewhere on overlapping
// dates is a soft warning, not a hard block — but only OPERATIONS_MANAGER/
// ADMIN can push through a real conflict; plain OPERATIONS must escalate.
export async function assignTrainer(eventId: string, input: unknown): Promise<AssignmentActionResult> {
  const ctx = await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = trainerAssignmentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: event } = await supabase.from("events").select("start_date, end_date").eq("id", eventId).single()
  if (!event?.start_date || !event?.end_date) {
    return { ok: false, message: "Tanggal event belum diisi" }
  }

  const { data: others } = await supabase
    .from("trainer_assignments")
    .select("event_id, events(event_code, event_name, start_date, end_date)")
    .eq("trainer_id", parsed.data.trainer_id)
    .neq("event_id", eventId)
    .not("status", "in", "(CANCELLED,REPLACED)")
    .is("deleted_at", null)

  const conflict = (others ?? []).find(
    (o) =>
      o.events?.start_date &&
      o.events?.end_date &&
      datesOverlap(event.start_date!, event.end_date!, o.events.start_date, o.events.end_date)
  )

  const canOverride = ctx.roles.includes("OPERATIONS_MANAGER") || ctx.roles.includes("ADMIN")
  if (conflict && !canOverride) {
    return {
      ok: false,
      message: `Trainer ini sudah dijadwalkan di ${conflict.events?.event_code ?? conflict.events?.event_name} pada tanggal yang tumpang tindih. Minta Ops Manager untuk override.`,
    }
  }

  const { error } = await supabase.from("trainer_assignments").insert({
    event_id: eventId,
    trainer_id: parsed.data.trainer_id,
    role: parsed.data.role,
    fee: parsed.data.fee ?? null,
    notes: parsed.data.notes || null,
    status: "ASSIGNED",
    created_by: ctx.userId,
  })

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return {
    ok: true,
    warning: conflict
      ? `Trainer di-assign meski bentrok jadwal dengan ${conflict.events?.event_code ?? conflict.events?.event_name} (di-override).`
      : undefined,
  }
}

export async function updateTrainerAssignmentStatus(
  id: string,
  eventId: string,
  status: "REQUESTED" | "AVAILABLE" | "ASSIGNED" | "CONFIRMED" | "CANCELLED" | "REPLACED"
): Promise<AssignmentActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.from("trainer_assignments").update({ status }).eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function removeTrainerAssignment(id: string, eventId: string): Promise<AssignmentActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase
    .from("trainer_assignments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function bookVenue(eventId: string, input: unknown): Promise<AssignmentActionResult> {
  const ctx = await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = venueBookingSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: event } = await supabase.from("events").select("start_date, end_date").eq("id", eventId).single()
  if (!event?.start_date || !event?.end_date) {
    return { ok: false, message: "Tanggal event belum diisi" }
  }

  const { data: others } = await supabase
    .from("venue_bookings")
    .select("event_id, events(event_code, event_name, start_date, end_date)")
    .eq("venue_id", parsed.data.venue_id)
    .neq("event_id", eventId)
    .not("status", "eq", "CANCELLED")
    .is("deleted_at", null)

  const conflict = (others ?? []).find(
    (o) =>
      o.events?.start_date &&
      o.events?.end_date &&
      datesOverlap(event.start_date!, event.end_date!, o.events.start_date, o.events.end_date)
  )

  const canOverride = ctx.roles.includes("OPERATIONS_MANAGER") || ctx.roles.includes("ADMIN")
  if (conflict && !canOverride) {
    return {
      ok: false,
      message: `Venue ini sudah dibooking untuk ${conflict.events?.event_code ?? conflict.events?.event_name} pada tanggal yang tumpang tindih. Minta Ops Manager untuk override.`,
    }
  }

  const { error } = await supabase.from("venue_bookings").insert({
    event_id: eventId,
    venue_id: parsed.data.venue_id,
    estimated_cost: parsed.data.estimated_cost ?? null,
    confirmation_number: parsed.data.confirmation_number || null,
    notes: parsed.data.notes || null,
    status: "HOLD",
    created_by: ctx.userId,
  })

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return {
    ok: true,
    warning: conflict
      ? `Venue di-booking meski bentrok jadwal dengan ${conflict.events?.event_code ?? conflict.events?.event_name} (di-override).`
      : undefined,
  }
}

export async function updateVenueBookingStatus(
  id: string,
  eventId: string,
  status: "INQUIRY" | "HOLD" | "BOOKED" | "CONFIRMED" | "CANCELLED"
): Promise<AssignmentActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.from("venue_bookings").update({ status }).eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function removeVenueBooking(id: string, eventId: string): Promise<AssignmentActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase
    .from("venue_bookings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function assignEquipment(eventId: string, input: unknown): Promise<AssignmentActionResult> {
  const ctx = await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = equipmentAssignmentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: event } = await supabase.from("events").select("start_date, end_date").eq("id", eventId).single()
  if (!event?.start_date || !event?.end_date) {
    return { ok: false, message: "Tanggal event belum diisi" }
  }

  const { data: equipment } = await supabase
    .from("equipment")
    .select("total_quantity, name")
    .eq("id", parsed.data.equipment_id)
    .single()

  const { data: others } = await supabase
    .from("equipment_assignments")
    .select("quantity, event_id, events(event_code, event_name, start_date, end_date)")
    .eq("equipment_id", parsed.data.equipment_id)
    .neq("event_id", eventId)
    .not("status", "eq", "RETURNED")
    .is("deleted_at", null)

  const overlapping = (others ?? []).filter(
    (o) =>
      o.events?.start_date &&
      o.events?.end_date &&
      datesOverlap(event.start_date!, event.end_date!, o.events.start_date, o.events.end_date)
  )
  const committedElsewhere = overlapping.reduce((sum, o) => sum + o.quantity, 0)
  const remaining = (equipment?.total_quantity ?? 0) - committedElsewhere

  const canOverride = ctx.roles.includes("OPERATIONS_MANAGER") || ctx.roles.includes("ADMIN")
  if (parsed.data.quantity > remaining && !canOverride) {
    return {
      ok: false,
      message: `Hanya tersisa ${Math.max(remaining, 0)} unit "${equipment?.name}" pada tanggal ini (sisanya sudah dipakai event lain). Minta Ops Manager untuk override.`,
    }
  }

  const { error } = await supabase.from("equipment_assignments").insert({
    event_id: eventId,
    equipment_id: parsed.data.equipment_id,
    quantity: parsed.data.quantity,
    status: "PLANNED",
    created_by: ctx.userId,
  })

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return {
    ok: true,
    warning:
      parsed.data.quantity > remaining
        ? `Stok "${equipment?.name}" sudah kurang pada tanggal ini, tetap ditugaskan (di-override).`
        : undefined,
  }
}

export async function updateEquipmentAssignmentStatus(
  id: string,
  eventId: string,
  status: "PLANNED" | "PREPARED" | "IN_USE" | "RETURNED"
): Promise<AssignmentActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase
    .from("equipment_assignments")
    .update({ status, returned_at: status === "RETURNED" ? new Date().toISOString() : null })
    .eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function removeEquipmentAssignment(id: string, eventId: string): Promise<AssignmentActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase
    .from("equipment_assignments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
