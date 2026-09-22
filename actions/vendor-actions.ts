"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/session"
import { vendorSchema } from "@/lib/validations/vendor"

export type VendorActionResult = { ok: boolean; message?: string; id?: string }

function fromZodError(error: { message: string }): VendorActionResult {
  return { ok: false, message: error.message }
}

export async function createVendor(input: unknown): Promise<VendorActionResult> {
  const ctx = await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "ADMIN")
  const parsed = vendorSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      company_id: ctx.profile.company_id,
      name: parsed.data.name,
      category: parsed.data.category || null,
      contact_name: parsed.data.contact_name || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      npwp: parsed.data.npwp || null,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/vendors")
  return { ok: true, id: data.id }
}

export async function updateVendor(id: string, input: unknown): Promise<VendorActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "ADMIN")
  const parsed = vendorSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { error } = await supabase
    .from("vendors")
    .update({
      name: parsed.data.name,
      category: parsed.data.category || null,
      contact_name: parsed.data.contact_name || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      npwp: parsed.data.npwp || null,
    })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/vendors")
  return { ok: true }
}

export async function deactivateVendor(id: string): Promise<VendorActionResult> {
  await requireRole("OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase
    .from("vendors")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/vendors")
  return { ok: true }
}
