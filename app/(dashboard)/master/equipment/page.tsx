import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { EquipmentDialog, type EquipmentRow } from "./equipment-dialog"
import { EquipmentRowActions } from "./equipment-row-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function EquipmentPage() {
  const ctx = await requireAuth()
  const canManage = hasAnyRole(ctx.roles, ["OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"])
  const supabase = await createClient()
  const { data: equipment, error } = await supabase
    .from("equipment")
    .select("id, name, category, total_quantity, notes")
    .is("deleted_at", null)
    .order("name")

  const rows = (equipment ?? []) as EquipmentRow[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{rows.length} equipment terdaftar</p>
        {canManage && <EquipmentDialog />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && rows.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada equipment — tambahkan yang pertama.
        </p>
      )}

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Catatan</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell>{e.category ?? "—"}</TableCell>
                <TableCell>{e.total_quantity}</TableCell>
                <TableCell>{e.notes ?? "—"}</TableCell>
                {canManage && (
                  <TableCell>
                    <EquipmentRowActions equipment={e} />
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