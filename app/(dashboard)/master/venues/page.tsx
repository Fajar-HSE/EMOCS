import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { VenueDialog, type VenueRow } from "./venue-dialog"
import { VenueRowActions } from "./venue-row-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function VenuesPage() {
  const ctx = await requireAuth()
  const canManage = hasAnyRole(ctx.roles, ["OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"])
  const supabase = await createClient()
  const [{ data: venues, error }, { data: cities }] = await Promise.all([
    supabase
      .from("venues")
      .select(
        "id, name, venue_type, address, city_id, capacity, contact_name, contact_phone, reference_price, cities(name)"
      )
      .is("deleted_at", null)
      .order("name"),
    supabase.from("cities").select("id, name").is("deleted_at", null).order("name"),
  ])

  const rows = (venues ?? []) as VenueRow[]
  const cityName = new Map((venues ?? []).map((v) => [v.id, v.cities?.name]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{rows.length} venue terdaftar</p>
        {canManage && <VenueDialog cities={cities ?? []} />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && rows.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada venue — tambahkan venue pertama.
        </p>
      )}

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Kapasitas</TableHead>
              <TableHead>Harga Acuan</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.venue_type ?? "—"}</TableCell>
                <TableCell>{cityName.get(v.id) ?? "—"}</TableCell>
                <TableCell>{v.capacity ?? "—"}</TableCell>
                <TableCell>
                  {v.reference_price != null
                    ? v.reference_price.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
                    : "—"}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <VenueRowActions venue={v} cities={cities ?? []} />
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