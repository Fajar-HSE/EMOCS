import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { CityDialog, type CityRow } from "./city-dialog"
import { CityRowActions } from "./city-row-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function CitiesPage() {
  const ctx = await requireAuth()
  const canManage = hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"])
  const supabase = await createClient()
  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, province")
    .is("deleted_at", null)
    .order("name")

  const rows = (cities ?? []) as CityRow[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{rows.length} kota terdaftar</p>
        {canManage && <CityDialog />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && rows.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada kota. Tambahkan yang pertama.
        </p>
      )}

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Provinsi</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.province ?? "—"}</TableCell>
                {canManage && (
                  <TableCell>
                    <CityRowActions city={c} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}