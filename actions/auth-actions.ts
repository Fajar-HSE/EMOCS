"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth"

export type ActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
} | null

export async function signInWithPassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Generic message on purpose (PRD S-01: cegah enumerasi akun)
    return { ok: false, message: "Email atau password salah." }
  }

  redirect("/dashboard")
}

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next ?? "/dashboard")}`,
    },
  })

  if (error || !data.url) {
    redirect("/login?error=oauth_init_failed")
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Never reveal whether the email exists (S-01 anti-enumeration).
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  })

  return {
    ok: true,
    message:
      "Jika email terdaftar, tautan reset password telah dikirim. Periksa kotak masuk Anda.",
  }
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { ok: false, message: "Gagal mengubah password. Coba lagi." }
  }

  redirect("/dashboard")
}
