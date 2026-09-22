import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { TrainerDialog, type TrainerRow } from "./trainer-dialog"
import { TrainerRowActions } from "./trainer-row-actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function TrainersPage() {
  const ctx = await requireAuth()
  const canManage = hasAnyRole(ctx.roles, ["OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"])
  const supabase = await createClient()
  const [{ data: trainers, error }, { data: cities }] = await Promise.all([
    supabase
      .from("trainers")
      .select(
        "id, full_name, trainer_type, city_id, phone, email, rate_card, certification_name, certification_expires_at, cities(name)"
      )
      .is("deleted_at", null)
      .order("full_name"),
    supabase.from("cities").select("id, name").is("deleted_at", null).order("name"),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const rows = (trainers ?? []) as TrainerRow[]
  const cityName = new Map((trainers ?? []).map((t) => [t.id, t.cities?.name]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{rows.length} trainer terdaftar</p>
        {canManage && <TrainerDialog cities={cities ?? []} />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && rows.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada trainer — tambahkan trainer pertama.
        </p>
      )}

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Rate Card</TableHead>
              <TableHead>Sertifikasi</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => {
              const expired = t.certification_expires_at && t.certification_expires_at < today
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.trainer_type}</Badge>
                  </TableCell>
                  <TableCell>{cityName.get(t.id) ?? "—"}</TableCell>
                  <TableCell>{t.phone ?? "—"}</TableCell>
                  <TableCell>
                    {t.rate_card != null
                      ? t.rate_card.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {t.certification_name ?? "—"}
                    {expired && (
                      <Badge variant="destructive" className="ml-1">
                        Kedaluwarsa
                      </Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <TrainerRowActions trainer={t} cities={cities ?? []} />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}