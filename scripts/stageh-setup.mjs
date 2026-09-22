// Dev verification helper for Phase 3 Stage H (MFA). Not part of the app.
// 1. Cleans up the stray unverified TOTP factor created on the seeded admin
//    account during an ad-hoc "is MFA enabled on this project" probe.
// 2. Creates a fresh test FINANCE user via invited_emails + Admin Auth API,
//    following the exact invite-consumption flow in handle_new_user()
//    (0007_functions_triggers.sql).
import { readFileSync } from "node:fs"
import { sql, signIn, env_ as env } from "./stageb-verify.mjs"

const adminHeaders = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
}

// --- 1. clean up stray unverified factor on the shared dev admin account ---
const { accessToken: adminToken } = await signIn()
const listRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/factors`, {
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${adminToken}` },
})
console.log("admin factors:", listRes.status, await listRes.clone().text().then(t => t.slice(0, 300)))
const { factors } = await listRes.json().catch(() => ({ factors: undefined }))
if (factors) {
  for (const f of factors) {
    const del = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/factors/${f.id}`, {
      method: "DELETE",
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${adminToken}` },
    })
    console.log("deleted stray factor", f.id, del.status)
  }
}

// --- 2. create test FINANCE user ---
const testEmail = "stageh-finance-test@emocs-dev.local"
const testPassword = "EmocsStageHTest123!"

// invited_by must be a real profile id (FK), reuse the admin's own profile.
const adminProfile = await sql(
  `select id from profiles where email = 'fajar.hseskillup@gmail.com' limit 1`
)
const invitedBy = adminProfile[0].id

await sql(
  `insert into invited_emails (email, full_name, roles, invited_by)
   values ('${testEmail}', 'Stage H Finance Test', array['FINANCE'], '${invitedBy}')
   on conflict (email) do update set roles = excluded.roles, consumed_at = null`
)

const createRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({ email: testEmail, password: testPassword, email_confirm: true }),
})
const createBody = await createRes.json()
console.log("create test user:", createRes.status, createBody.id ?? createBody)

const check = await sql(
  `select p.id, p.email, array_agg(r.name) as roles
   from profiles p
   join user_roles ur on ur.user_id = p.id
   join roles r on r.id = ur.role_id
   where p.email = '${testEmail}'
   group by p.id, p.email`
)
console.log("resulting profile/roles:", JSON.stringify(check))
