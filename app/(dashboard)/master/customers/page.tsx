import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { CustomerDialog, type CustomerWithContact } from "./customer-dialog"
import { CustomerRowActions } from "./customer-row-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function CustomersPage() {
  const ctx = await requireAuth()
  const canCreate = hasAnyRole(ctx.roles, ["SALES", "SALES_MANAGER", "OPERATIONS_MANAGER", "ADMIN"])
  const canManage = hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"])
  const supabase = await createClient()
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, address, phone, npwp, industry, notes, is_active")
    .is("deleted_at", null)
    .order("name")

  const ids = (customers ?? []).map((c) => c.id)
  const { data: contacts } = ids.length
    ? await supabase
        .from("customer_contacts")
        .select("customer_id, full_name, job_title, phone, email")
        .in("customer_id", ids)
        .eq("is_primary", true)
        .is("deleted_at", null)
    : { data: [] }
  const contactByCustomer = new Map((contacts ?? []).map((c) => [c.customer_id, c]))

  const rows: (CustomerWithContact & { is_active: boolean })[] = (customers ?? []).map((c) => {
    const contact = contactByCustomer.get(c.id)
    return {
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      npwp: c.npwp,
      industry: c.industry,
      notes: c.notes,
      pic_name: contact?.full_name ?? "",
      pic_title: contact?.job_title ?? "",
      pic_phone: contact?.phone ?? "",
      pic_email: contact?.email ?? "",
      is_active: c.is_active,
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {rows.length} customer terdaftar
        </p>
        {canCreate && <CustomerDialog />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && rows.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada customer. Tambahkan customer pertama Anda.
        </p>
      )}

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Industri</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>
                  {c.pic_name || "—"}
                  {c.pic_phone && <p className="text-muted-foreground text-xs">{c.pic_phone}</p>}
                </TableCell>
                <TableCell>{c.industry ?? "—"}</TableCell>
                {canManage && (
                  <TableCell>
                    <CustomerRowActions customer={c} />
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
