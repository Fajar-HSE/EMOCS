"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAuth, requireRole } from "@/lib/auth/session"
import { mfaCodeSchema } from "@/lib/validations/mfa"

export type MfaActionResult = { ok: boolean; message?: string }
export type EnrollResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; message: string }

function mapMfaError(error: { message: string; code?: string }): string {
  if (error.code === "insufficient_aal") {
    return "Verifikasi kode MFA Anda saat ini dulu sebelum melakukan ini"
  }
  if (error.message?.toLowerCase().includes("invalid") || error.code === "mfa_verification_failed") {
    return "Kode salah atau sudah kedaluwarsa. Coba lagi."
  }
  return error.message
}

// Starts enrolling a new TOTP factor. The factor is created "unverified" and
// only becomes real (usable for sign-in / requireAAL2) once confirmMfaCode()
// succeeds — an abandoned unverified factor can be discarded any time via
// cancelMfaEnrollment(), unlike a verified one (Supabase requires aal2 to
// remove those, by design, so a stolen aal1 session can't disable MFA).
export async function startMfaEnrollment(): Promise<EnrollResult> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
  })
  if (error) return { ok: false, message: mapMfaError(error) }
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

export async function cancelMfaEnrollment(factorId: string): Promise<MfaActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { ok: false, message: mapMfaError(error) }
  return { ok: true }
}

// Used both to finish a fresh enrollment AND to step an existing aal1
// session up to aal2 for an already-verified factor — Supabase's
// challenge()+verify() sequence is identical either way.
export async function verifyMfaCode(input: unknown): Promise<MfaActionResult> {
  await requireAuth()
  const parsed = mfaCodeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: parsed.data.factorId,
  })
  if (challengeError) return { ok: false, message: mapMfaError(challengeError) }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  })
  if (verifyError) return { ok: false, message: mapMfaError(verifyError) }

  revalidatePath("/account/security")
  return { ok: true }
}

// Self-service removal of a verified factor — Supabase itself requires the
// caller to already be at aal2 to do this (a stolen aal1 session can't turn
// MFA off), so this simply surfaces that as a friendly message on failure.
export async function unenrollMfaFactor(factorId: string): Promise<MfaActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { ok: false, message: mapMfaError(error) }
  revalidatePath("/account/security")
  return { ok: true }
}

// Recovery path (§ Stage H plan) for a lost/broken authenticator device:
// Admin force-removes every factor on the affected user via the Auth Admin
// API, bypassing the aal2-required-for-self-unenroll restriction. The user
// is immediately required to re-enroll on their next FINANCE/ADMIN action.
export async function adminResetUserMfa(userId: string): Promise<MfaActionResult> {
  await requireRole("ADMIN")
  const admin = createAdminClient()

  const { data, error: listError } = await admin.auth.admin.mfa.listFactors({ userId })
  if (listError) return { ok: false, message: listError.message }

  for (const factor of data.factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId })
    if (error) return { ok: false, message: error.message }
  }

  revalidatePath("/admin")
  return { ok: true, message: `${data.factors.length} faktor MFA dihapus untuk user ini.` }
}
