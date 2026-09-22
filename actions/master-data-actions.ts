"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/session"
import {
  customerSchema,
  customerContactSchema,
  trainingSchema,
  citySchema,
  trainerSchema,
  venueSchema,
  equipmentSchema,
} from "@/lib/validations/master-data"

export type ActionResult = { ok: boolean; message?: string; id?: string }

function fromZodError(error: { message: string }): ActionResult {
  return { ok: false, message: error.message }
}

function mapCustomerError(error: { message: string }): string {
  if (error.message.startsWith("CUSTOMER_IN_USE")) {
    return "Customer tidak bisa dihapus karena sudah dipakai di event"
  }
  if (error.message.startsWith("CUSTOMER_NOT_FOUND")) {
    return "Customer tidak ditemukan atau sudah dihapus"
  }
  return error.message
}

// Soft-delete master data selain customer via RPC SECURITY DEFINER
// (0036_master_data_deactivate_rpcs.sql) — UPDATE ... SET deleted_at lewat
// RLS selalu gagal WITH CHECK. Prefix pesan dari fungsi di-process di sini
// menjadi pesan yang bisa dibaca user.
function mapMasterError(error: { message: string }, map: Record<string, string>): string {
  for (const [prefix, text] of Object.entries(map)) {
    if (error.message.startsWith(prefix)) return text
  }
  return error.message
}

export async function createCustomer(input: unknown): Promise<ActionResult> {
  const ctx = await requireRole("SALES", "SALES_MANAGER", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: ctx.profile.company_id,
      name: parsed.data.name,
      npwp: parsed.data.npwp || null,
      industry: parsed.data.industry || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }

  // PIC utama opsional — bila diisi, catat sebagai kontak primer. Best-effort
  // cleanup seperti createEventBudget: jangan sisakan customer yatim bila
  // insert kontak gagal.
  if (parsed.data.pic_name && parsed.data.pic_name.length > 0) {
    const { error: contactError } = await supabase.from("customer_contacts").insert({
      customer_id: data.id,
      full_name: parsed.data.pic_name,
      job_title: parsed.data.pic_title || null,
      phone: parsed.data.pic_phone || null,
      email: parsed.data.pic_email || null,
      is_primary: true,
    })
    if (contactError) {
      await supabase.from("customers").delete().eq("id", data.id)
      return { ok: false, message: contactError.message }
    }
  }

  revalidatePath("/master/customers")
  return { ok: true, id: data.id }
}

export async function updateCustomer(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      npwp: parsed.data.npwp || null,
      industry: parsed.data.industry || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }

  // Upsert kontak primer: update bila sudah ada, insert bila belum.
  // Bila semua field PIC kosong, kontak lama dibiarkan apa adanya.
  if (parsed.data.pic_name && parsed.data.pic_name.length > 0) {
    const { data: existing } = await supabase
      .from("customer_contacts")
      .select("id")
      .eq("customer_id", id)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .limit(1)
      .single()
    const contactRow = {
      full_name: parsed.data.pic_name,
      job_title: parsed.data.pic_title || null,
      phone: parsed.data.pic_phone || null,
      email: parsed.data.pic_email || null,
    }
    const { error: contactError = null } = existing
      ? await supabase.from("customer_contacts").update(contactRow).eq("id", existing.id)
      : await supabase.from("customer_contacts").insert({ customer_id: id, is_primary: true, ...contactRow })
    if (contactError) return { ok: false, message: contactError.message }
  }

  revalidatePath("/master/customers")
  return { ok: true }
}

export async function deactivateCustomer(id: string): Promise<ActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  // Via RPC, bukan UPDATE langsung: UPDATE ... SET deleted_at lewat RLS selalu
  // gagal WITH CHECK (PostgreSQL ikut menegakkan USING policy SELECT ke baris
  // baru) — lihat 0031_customer_deactivate_rpc.sql. Guard in-use tetap jalan
  // di dalam fungsi (dengan visibilitas penuh).
  const { error } = await supabase.rpc("deactivate_customer", { p_customer_id: id })

  if (error) return { ok: false, message: mapCustomerError(error) }
  revalidatePath("/master/customers")
  return { ok: true }
}

export async function createCustomerContact(input: unknown): Promise<ActionResult> {
  await requireRole("SALES", "SALES_MANAGER", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = customerContactSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customer_contacts")
    .insert({
      customer_id: parsed.data.customer_id,
      full_name: parsed.data.full_name,
      job_title: parsed.data.job_title || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      is_primary: parsed.data.is_primary,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/customers")
  return { ok: true, id: data.id }
}

export async function createTraining(input: unknown): Promise<ActionResult> {
  const ctx = await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = trainingSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("trainings")
    .insert({
      company_id: ctx.profile.company_id,
      code: parsed.data.code,
      name: parsed.data.name,
      category: parsed.data.category || null,
      standard_duration_days: parsed.data.standard_duration_days ?? null,
      has_certification: parsed.data.has_certification,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/trainings")
  return { ok: true, id: data.id }
}

export async function updateTraining(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = trainingSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("trainings")
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      category: parsed.data.category || null,
      standard_duration_days: parsed.data.standard_duration_days ?? null,
      has_certification: parsed.data.has_certification,
    })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/trainings")
  return { ok: true }
}

export async function deactivateTraining(id: string): Promise<ActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.rpc("deactivate_training", { p_training_id: id })

  if (error) {
    return {
      ok: false,
      message: mapMasterError(error, {
        TRAINING_NOT_FOUND: "Training tidak ditemukan atau sudah dinonaktifkan",
        TRAINING_IN_USE: "Training tidak bisa dihapus karena sudah dipakai di event",
      }),
    }
  }
  revalidatePath("/master/trainings")
  return { ok: true }
}

export async function createCity(input: unknown): Promise<ActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = citySchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cities")
    .insert({ name: parsed.data.name, province: parsed.data.province || null })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/cities")
  return { ok: true, id: data.id }
}

export async function updateCity(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = citySchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("cities")
    .update({ name: parsed.data.name, province: parsed.data.province || null })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/cities")
  return { ok: true }
}

export async function deactivateCity(id: string): Promise<ActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  // Kota tidak punya kolom is_active — soft delete lewat deleted_at saja.
  const { error } = await supabase.rpc("deactivate_city", { p_city_id: id })

  if (error) {
    return {
      ok: false,
      message: mapMasterError(error, {
        CITY_NOT_FOUND: "Kota tidak ditemukan atau sudah dihapus",
        CITY_IN_USE: "Kota tidak bisa dihapus karena sudah dipakai di event",
      }),
    }
  }
  revalidatePath("/master/cities")
  return { ok: true }
}

// ============================================================
// Phase 2 §13.1-13.3 — Trainer, Venue, Equipment master data
// ============================================================

export async function createTrainer(input: unknown): Promise<ActionResult> {
  const ctx = await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = trainerSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("trainers")
    .insert({
      company_id: ctx.profile.company_id,
      full_name: parsed.data.full_name,
      trainer_type: parsed.data.trainer_type,
      city_id: parsed.data.city_id || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      rate_card: parsed.data.rate_card ?? null,
      certification_name: parsed.data.certification_name || null,
      certification_expires_at: parsed.data.certification_expires_at || null,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/trainers")
  return { ok: true }
}

export async function updateTrainer(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = trainerSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("trainers")
    .update({
      full_name: parsed.data.full_name,
      trainer_type: parsed.data.trainer_type,
      city_id: parsed.data.city_id || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      rate_card: parsed.data.rate_card ?? null,
      certification_name: parsed.data.certification_name || null,
      certification_expires_at: parsed.data.certification_expires_at || null,
    })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/trainers")
  return { ok: true }
}

export async function deactivateTrainer(id: string): Promise<ActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.rpc("deactivate_trainer", { p_trainer_id: id })

  if (error) {
    return {
      ok: false,
      message: mapMasterError(error, {
        TRAINER_NOT_FOUND: "Trainer tidak ditemukan atau sudah dinonaktifkan",
        TRAINER_IN_USE: "Trainer tidak bisa dihapus karena sudah ditugaskan ke event",
      }),
    }
  }
  revalidatePath("/master/trainers")
  return { ok: true }
}

export async function createVenue(input: unknown): Promise<ActionResult> {
  const ctx = await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = venueSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("venues")
    .insert({
      company_id: ctx.profile.company_id,
      name: parsed.data.name,
      venue_type: parsed.data.venue_type || null,
      address: parsed.data.address || null,
      city_id: parsed.data.city_id || null,
      capacity: parsed.data.capacity ?? null,
      contact_name: parsed.data.contact_name || null,
      contact_phone: parsed.data.contact_phone || null,
      reference_price: parsed.data.reference_price ?? null,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/venues")
  return { ok: true, id: data.id }
}

export async function updateVenue(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = venueSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("venues")
    .update({
      name: parsed.data.name,
      venue_type: parsed.data.venue_type || null,
      address: parsed.data.address || null,
      city_id: parsed.data.city_id || null,
      capacity: parsed.data.capacity ?? null,
      contact_name: parsed.data.contact_name || null,
      contact_phone: parsed.data.contact_phone || null,
      reference_price: parsed.data.reference_price ?? null,
    })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/venues")
  return { ok: true }
}

export async function deactivateVenue(id: string): Promise<ActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.rpc("deactivate_venue", { p_venue_id: id })

  if (error) {
    return {
      ok: false,
      message: mapMasterError(error, {
        VENUE_NOT_FOUND: "Venue tidak ditemukan atau sudah dinonaktifkan",
        VENUE_IN_USE: "Venue tidak bisa dihapus karena sudah dipakai di event",
      }),
    }
  }
  revalidatePath("/master/venues")
  return { ok: true }
}

export async function createEquipment(input: unknown): Promise<ActionResult> {
  const ctx = await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = equipmentSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("equipment")
    .insert({
      company_id: ctx.profile.company_id,
      name: parsed.data.name,
      category: parsed.data.category || null,
      total_quantity: parsed.data.total_quantity,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/equipment")
  return { ok: true, id: data.id }
}

export async function updateEquipment(id: string, input: unknown): Promise<ActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const parsed = equipmentSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("equipment")
    .update({
      name: parsed.data.name,
      category: parsed.data.category || null,
      total_quantity: parsed.data.total_quantity,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/equipment")
  return { ok: true }
}

export async function deactivateEquipment(id: string): Promise<ActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.rpc("deactivate_equipment", { p_equipment_id: id })

  if (error) {
    return {
      ok: false,
      message: mapMasterError(error, {
        EQUIPMENT_NOT_FOUND: "Perlengkapan tidak ditemukan atau sudah dinonaktifkan",
        EQUIPMENT_IN_USE: "Perlengkapan tidak bisa dihapus karena sudah ditugaskan ke event",
      }),
    }
  }
  revalidatePath("/master/equipment")
  return { ok: true }
}
