// One-off dev helper: creates/updates a password for the seeded admin so we
// can verify authenticated pages in the browser without waiting on Google
// OAuth setup. Uses raw fetch (the supabase-js admin client failed with an
// unexplained fetch error in this Node environment, but raw fetch works
// fine against the same endpoints). Not part of the app; safe to delete
// after Stage 3 verification.
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

const baseUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`
const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
}

const email = "fajar.hseskillup@gmail.com"
const password = "EmocsDevTest123!"

const listRes = await fetch(baseUrl, { headers })
const { users } = await listRes.json()
const existing = users.find((u) => u.email === email)

if (existing) {
  const res = await fetch(`${baseUrl}/${existing.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password, email_confirm: true }),
  })
  console.log("update status", res.status, await res.text())
} else {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  console.log("create status", res.status, await res.text())
}
