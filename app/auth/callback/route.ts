import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Handles both the Google OAuth code exchange and the password-recovery
// magic link (Supabase routes both through the same `code` param — PRD
// §12.2.1 auth flow diagram).
//
// IMPORTANT: adds `?from_callback=1` to the redirect URL so the middleware
// (proxy.ts) can skip its redundant `getClaims()` call — the callback has
// *just* exchanged the code and is about to set the session cookie. Calling
// getClaims() again would add one extra Supabase round-trip (~80-200ms) for
// no benefit: the middleware re-reads the same JWT we just refreshed.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const url = new URL(`${origin}${next}`)
      url.searchParams.set("from_callback", "1")
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.redirect(`${origin}/auth-code-error`)
}
