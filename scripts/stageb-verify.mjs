// Dev verification helper for Phase 3 Stage B (event_budgets).
// Talks to the Supabase Management API query endpoint with the local access
// token — same "query langsung ke Supabase Cloud" pattern used all through
// Phase 2 verification. Not part of the app.
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=")
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const REF = env.SUPABASE_PROJECT_REF
const TOKEN = env.SUPABASE_ACCESS_TOKEN

// ponytail: no param binding on this endpoint — inlined literals instead.
// Dev-only helper (values are our own test ids), never used by the app.
export async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`SQL ${res.status}: ${text}`)
  }
  return JSON.parse(text)
}

// Sign in as the seeded dev admin (same account used for all Phase 1/2
// browser verification) and return its JWT + profile id.
export async function signIn(email = "fajar.hseskillup@gmail.com", password = "EmocsDevTest123!") {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`signin ${res.status}: ${JSON.stringify(body)}`)
  return { accessToken: body.access_token, userId: body.user.id }
}

// Call a PostgREST RPC as the signed-in user (so RLS + auth.uid() apply).
export async function rpc(accessToken, fn, args) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, ok: res.ok, body }
}

export const env_ = env
