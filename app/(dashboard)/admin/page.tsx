import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/session"
import type { Role } from "@/lib/auth/roles"
import { InviteUserDialog } from "./invite-user-dialog"
import { UserRowActions } from "./user-row-actions"
import { UserTeamSelect } from "./user-team-select"
import { TeamsSection } from "./teams-section"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function AdminPage() {
  await requireRole("ADMIN")
  const supabase = await createClient()

  // 4 independent reads in ONE round-trip batch.
  const [usersRes, teamsRes, activeUsersRes, pendingInvitesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, is_active, team_id, team:teams!profiles_team_id_fkey(name), user_roles!user_roles_user_id_fkey(roles(name))")
      .order("full_name"),
    supabase.from("teams").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("profiles").select("team_id").eq("is_active", true),
    supabase
      .from("invited_emails")
      .select("email, full_name, roles, invited_at")
      .is("consumed_at", null)
      .order("invited_at", { ascending: false }),
  ])

  const { data: users, error } = usersRes
  const { data: teams } = teamsRes
  const { data: activeUsers } = activeUsersRes
  const { data: pendingInvites } = pendingInvitesRes

  const memberCounts = new Map<string, number>()
  for (const u of activeUsers ?? []) {
    if (u.team_id) memberCounts.set(u.team_id, (memberCounts.get(u.team_id) ?? 0) + 1)
  }
  const teamsWithCounts = (teams ?? []).map((t) => ({ ...t, member_count: memberCounts.get(t.id) ?? 0 }))

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">User Management</h1>
          <InviteUserDialog teams={teams ?? []} />
        </div>

        {error && <p className="text-destructive text-sm">{error.message}</p>}

        {users && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tim Sales</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const roles = (u.user_roles ?? [])
                  .map((ur) => ur.roles?.name)
                  .filter((n): n is Role => !!n)
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {roles.length === 0 && <span className="text-muted-foreground">—</span>}
                      {roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {r}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      <UserTeamSelect userId={u.id} currentTeamId={u.team_id} teams={teams ?? []} />
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge>Aktif</Badge>
                      ) : (
                        <Badge variant="destructive">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserRowActions userId={u.id} isActive={u.is_active} currentRoles={roles} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <TeamsSection teams={teamsWithCounts} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Undangan Tertunda</h2>
        {pendingInvites?.length === 0 && (
          <p className="text-muted-foreground text-sm">Tidak ada undangan tertunda.</p>
        )}
        {pendingInvites && pendingInvites.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.map((inv) => (
                <TableRow key={inv.email}>
                  <TableCell>{inv.full_name ?? "—"}</TableCell>
                  <TableCell>{inv.email}</TableCell>
                  <TableCell className="flex flex-wrap gap-1">
                    {inv.roles.map((r: string) => (
                      <Badge key={r} variant="secondary">
                        {r}
                      </Badge>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
