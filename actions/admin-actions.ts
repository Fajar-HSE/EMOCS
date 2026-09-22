"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/session"
import { ROLES } from "@/lib/auth/roles"

export type ActionResult = { ok: boolean; message?: string }

const inviteUserSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  full_name: z.string().min(2, "Nama minimal 2 karakter"),
  roles: z.array(z.enum(ROLES)).min(1, "Pilih minimal 1 role"),
  team_id: z.string().uuid().optional().nullable(),
})

const teamSchema = z.object({
  name: z.string().min(2, "Nama tim minimal 2 karakter").max(60),
})

export async function inviteUser(input: unknown): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN")
  const parsed = inviteUserSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const email = parsed.data.email.toLowerCase().trim()
  const supabase = await createClient()

  const { error: inviteRowError } = await supabase.from("invited_emails").upsert(
    {
      email,
      full_name: parsed.data.full_name,
      roles: parsed.data.roles,
      team_id: parsed.data.team_id ?? null,
      invited_by: ctx.userId,
      consumed_at: null,
    },
    { onConflict: "email" }
  )
  if (inviteRowError) return { ok: false, message: inviteRowError.message }

  const admin = createAdminClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const { error: authInviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (authInviteError) {
    return { ok: false, message: `Baris undangan tersimpan, tapi email gagal terkirim: ${authInviteError.message}` }
  }

  revalidatePath("/admin")
  return { ok: true, message: `Undangan terkirim ke ${email}.` }
}

export async function createTeam(input: unknown): Promise<ActionResult> {
  const ctx = await requireRole("ADMIN", "OPERATIONS_MANAGER")
  const parsed = teamSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from("teams")
    .insert({ name: parsed.data.name.trim(), company_id: ctx.profile!.company_id })
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin")
  return { ok: true }
}

export async function updateUserTeam(userId: string, teamId: string | null): Promise<ActionResult> {
  await requireRole("ADMIN", "OPERATIONS_MANAGER")
  const supabase = await createClient()

  const { error } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", userId)
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin")
  return { ok: true }
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole("ADMIN")
  const supabase = await createClient()

  if (!isActive) {
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("pic_user_id", userId)
      .not("status", "in", "(CLOSED,CANCELLED)")

    if (count && count > 0) {
      return {
        ok: false,
        message: `User masih menjadi PIC pada ${count} event aktif. Alihkan penugasan terlebih dahulu (BR-SYS-06).`,
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId)

  if (error) return { ok: false, message: error.message }
  revalidatePath("/admin")
  return { ok: true }
}

export async function updateUserRoles(userId: string, roleNames: string[]): Promise<ActionResult> {
  await requireRole("ADMIN")
  const supabase = await createClient()

  const { data: roleRows, error: roleLookupError } = await supabase
    .from("roles")
    .select("id, name")
    .in("name", roleNames)

  if (roleLookupError) return { ok: false, message: roleLookupError.message }

  const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId)
  if (deleteError) return { ok: false, message: deleteError.message }

  if (roleRows.length > 0) {
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert(roleRows.map((r) => ({ user_id: userId, role_id: r.id })))
    if (insertError) return { ok: false, message: insertError.message }
  }

  revalidatePath("/admin")
  return { ok: true }
}
