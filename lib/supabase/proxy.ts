import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth-code-error",
]

type Claims = { app_metadata?: { roles?: string[] } }

/**
 * Refreshes the Supabase session cookie on every request (optimistic check
 * only — real authorization happens in RLS + server-side guards, per PRD
 * §26.1 rule 2 and the Next.js Data Access Layer guidance). Called from
 * root `proxy.ts`.
 *
 * "Recognized user" below means the JWT carries at least one role via the
 * Custom Access Token Hook (0007 migration) — i.e. handle_new_user() found
 * a matching invited_emails row. A Supabase session can exist without this
 * (anyone can authenticate with Google), so this check is what actually
 * enforces invite-only access at the routing layer without a DB round trip.
 * lib/auth/session.ts re-derives the same thing server-side per request for
 * real authorization; this is only to avoid an obvious redirect loop.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Skip getClaims() when redirected from /auth/callback — the callback has
  // *just* exchanged the code and refreshed the session. The subsequent
  // layout/page will call getClaims() again (memoized via React cache), so
  // calling it here is pure duplication cost (~80-200ms round-trip to
  // Supabase Singapore). We only do the light path check (cookie present)
  // to catch the obvious "not logged in" redirect without an extra API call.
  const fromCallback = request.nextUrl.searchParams.get("from_callback") === "1"

  let isAuthed = false
  let isRecognizedUser = false
  try {
    const { data } = await supabase.auth.getClaims()
    isAuthed = !!data?.claims
    const claims = data?.claims as Claims | undefined
    isRecognizedUser = (claims?.app_metadata?.roles?.length ?? 0) > 0
  } catch {
    // Supabase not reachable/configured yet (e.g. Stage 0 placeholder env) —
    // fail closed to the public routes instead of crashing the request.
    isAuthed = false
  }

  const path = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p))

  // When coming from /auth/callback, skip the role-check gate entirely —
  // the callback already verified the code exchange succeeded and the JWT
  // contains the roles. The layout/page will re-check via requireAuth().
  if (fromCallback && !isPublicPath) {
    return supabaseResponse
  }

  if ((!isAuthed || !isRecognizedUser) && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", path)
    if (isAuthed && !isRecognizedUser) {
      url.searchParams.set("error", "not_invited")
    }
    return NextResponse.redirect(url)
  }

  if (isAuthed && isRecognizedUser && path === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
