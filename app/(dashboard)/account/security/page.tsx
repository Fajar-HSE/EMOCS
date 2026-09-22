import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { MfaManager } from "./mfa-manager"

// Deliberately calls requireAuth() only (never requireAAL2) — this page is
// exactly where a FINANCE/ADMIN user redirected by requireAAL2() lands to
// complete enrollment or the login challenge, so it must stay reachable
// regardless of the current AAL level.
export default async function SecurityPage() {
  const ctx = await requireAuth()
  const supabase = await createClient()

  const [{ data: claimsData }, { data: factorsData }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.mfa.listFactors(),
  ])

  const currentAal = (claimsData?.claims as { aal?: string } | undefined)?.aal ?? "aal1"
  const factors = factorsData?.all ?? []
  const mfaRequired = hasAnyRole(ctx.roles, ["FINANCE", "ADMIN"])

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Akun & Keamanan</h1>
        <p className="text-muted-foreground text-sm">{ctx.email}</p>
      </div>
      <MfaManager mfaRequired={mfaRequired} currentAal={currentAal} factors={factors} />
    </div>
  )
}
