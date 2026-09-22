import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"

/**
 * Server client for Server Components / Server Actions / Route Handlers.
 * Uses the anon key + user's session cookies, so Postgres RLS is enforced
 * exactly as it would be for that user — never use the service role key here.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component with no way to set cookies.
            // Ignorable as long as the proxy is refreshing the session.
          }
        },
      },
    }
  )
}
