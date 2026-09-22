import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

/**
 * Service-role client. NEVER import this outside of the narrow set of
 * admin/cron actions that genuinely need the Auth Admin API (invite user,
 * deactivate user) or a scheduled job. Every call site MUST perform its own
 * permission check (requireRole) before calling this — this client bypasses
 * RLS entirely. See PRD §23.3 "Aturan arsitektural yang tidak boleh dilanggar".
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
