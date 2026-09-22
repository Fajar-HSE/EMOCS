import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { VendorDialog } from "./vendor-dialog"
import { VendorRowActions } from "./vendor-row-actions"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function VendorsPage() {
  const ctx = await requireAuth()
  const canManage = hasAnyRole(ctx.roles, ["OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "ADMIN"])

  const supabase = await createClient()
  const { data: vendors, error } = await supabase
    .from("vendors")
    .select("id, name, category, contact_name, phone, email, npwp, is_active")
    .is("deleted_at", null)
    .order("name")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{vendors?.length ?? 0} vendor terdaftar</p>
        {canManage && <VendorDialog />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && vendors?.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada vendor — tambahkan vendor pertama.
        </p>
      )}

      {vendors && vendors.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.category ?? "—"}</TableCell>
                <TableCell>{v.contact_name ?? "—"}</TableCell>
                <TableCell>{v.phone ?? "—"}</TableCell>
                <TableCell>{v.email ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={v.is_active ? "default" : "secondary"}>
                    {v.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <VendorRowActions id={v.id} isActive={v.is_active} />
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
