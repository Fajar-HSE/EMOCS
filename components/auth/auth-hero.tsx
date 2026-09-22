import { createClient } from "@/lib/supabase/server"
import { EmocsMark } from "./emocs-mark"

/**
 * Brand panel for the auth pages. The ticker shows a REAL aggregate —
 * active events monitored today — via the pre-login-safe RPC
 * get_public_auth_stats() (0041, SECURITY DEFINER, aggregate only).
 * Falls back to a static line if the query fails.
 */
export async function AuthHero() {
  let activeToday: number | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.rpc("get_public_auth_stats")
    const parsed = data as { active_events_today?: unknown } | null
    if (typeof parsed?.active_events_today === "number") {
      activeToday = parsed.active_events_today
    }
  } catch {
    activeToday = null
  }

  return (
    <aside className="hero">
      <div className="studio-credit top">
        <span className="dotset">
          <span />
          <span />
          <span />
        </span>
        Sebuah produk Studio P26
      </div>

      <div className="hero-main">
        <EmocsMark />
        <div>
          <p className="hero-sub">Event Management &amp; Operational Control System</p>
          <h1 className="wordmark">EMOCS</h1>
          <p className="hero-tagline">
            Satu panel kendali untuk seluruh produksi acara Anda — dari jadwal, kru, hingga anggaran,
            real-time.
          </p>
        </div>
      </div>

      <div className="ticker" aria-live="polite">
        <span className="pulse" />
        <span>
          {activeToday === null
            ? "Panel kendali produksi acara Anda"
            : `${activeToday} acara aktif dipantau hari ini`}
        </span>
      </div>
    </aside>
  )
}
