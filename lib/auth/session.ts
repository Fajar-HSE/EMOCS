import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { type Role, hasAnyRole } from "@/lib/auth/roles"

export type AuthContext = {
  userId: string
  email: string
  roles: Role[]
  aal: string
  profile: {
    full_name: string
    team_id: string | null
    is_active: boolean
    company_id: string
  } | null
}

type Claims = {
  sub: string
  email?: string
  app_metadata?: { roles?: string[] }
  aal?: string
}

// Phase 3 §12.2.1/FR-AUTH-08: MFA is mandatory for FINANCE and ADMIN because
// they're the roles that touch financial data (budget/expense approval,
// financial closing, financial master data) — not the whole app.
const MFA_REQUIRED_ROLES: Role[] = ["FINANCE", "ADMIN"]

/**
 * Data Access Layer entry point (Next.js "Auth" guide pattern): verifies the
 * JWT locally via getClaims() (no network round trip — the custom access
 * token hook from the Stage 1 migration embeds roles in app_metadata),
 * memoized per request with React `cache`.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null

  const claims = data.claims as Claims
  const roles = (claims.app_metadata?.roles ?? []) as Role[]

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, team_id, is_active, company_id")
    .eq("id", claims.sub)
    .single()

  if (profile && profile.is_active === false) return null

  return {
    userId: claims.sub,
    email: claims.email ?? "",
    roles,
    aal: claims.aal ?? "aal1",
    profile: profile ?? null,
  }
})

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) redirect("/login")
  return ctx
}

export async function requireRole(...allowed: Role[]): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!hasAnyRole(ctx.roles, allowed)) {
    redirect("/dashboard?error=forbidden")
  }
  return ctx
}

/**
 * Call from every financial *judgment* mutation — approvals (decide_*),
 * mark-paid, financial master data (cost category, approval threshold),
 * financial closing — right after requireAuth()/requireRole(). A no-op for
 * callers who don't hold FINANCE or ADMIN.
 *
 * Deliberately NOT called for: expense/budget creation-submission-draft
 * lifecycle (the approval judgment itself is what MFA protects), financial
 * *reads* (authorization enforced in-DB via can_view_event_financials();
 * the Event Detail page calls these during render), and shared master data
 * usable by non-financial roles (vendors). See the per-action comments.
 *
 * Scoped to "does *this caller* need MFA", not a blanket gate on
 * requireAuth() itself, so the rest of the app (customers, events, tasks,
 * etc.) stays unaffected even for an Admin who hasn't enrolled yet.
 * `/account/security` itself must never call this (infinite redirect).
 */
export async function requireAAL2(ctx: AuthContext): Promise<void> {
  if (hasAnyRole(ctx.roles, MFA_REQUIRED_ROLES) && ctx.aal !== "aal2") {
    redirect("/account/security?mfa=required")
  }
}
