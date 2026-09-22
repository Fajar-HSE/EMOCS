import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { CostCategoryDialog } from "./cost-category-dialog"
import { CostCategoryRowActions } from "./cost-category-row-actions"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CostCategoriesPage() {
  const ctx = await requireAuth()
  const canManage = hasAnyRole(ctx.roles, ["FINANCE", "ADMIN"])

  const supabase = await createClient()
  const { data: categories, error } = await supabase
    .from("cost_categories")
    .select("id, code, name, sort_order, is_active")
    .is("deleted_at", null)
    .order("sort_order")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {categories?.length ?? 0} kategori biaya terdaftar
        </p>
        {canManage && <CostCategoryDialog />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && categories?.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada kategori biaya — tambahkan kategori pertama.
        </p>
      )}

      {categories && categories.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Urutan</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground">{c.sort_order}</TableCell>
                <TableCell className="font-mono text-sm">{c.code}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? "default" : "secondary"}>
                    {c.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <CostCategoryRowActions id={c.id} isActive={c.is_active} />
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
