import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { TrainingDialog, type TrainingRow } from "./training-dialog"
import { TrainingRowActions } from "./training-row-actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function TrainingsPage() {
  const ctx = await requireAuth()
  const canManage = hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"])
  const supabase = await createClient()
  const { data: trainings, error } = await supabase
    .from("trainings")
    .select("id, code, name, category, standard_duration_days, has_certification, is_active")
    .is("deleted_at", null)
    .order("name")

  const rows = (trainings ?? []) as TrainingRow[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {rows.length} training/program terdaftar
        </p>
        {canManage && <TrainingDialog />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && rows.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada training/program. Tambahkan yang pertama.
        </p>
      )}

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Sertifikasi</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.code}</TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.category ?? "—"}</TableCell>
                <TableCell>{t.standard_duration_days ? `${t.standard_duration_days} hari` : "—"}</TableCell>
                <TableCell>
                  {t.has_certification ? <Badge variant="secondary">Ya</Badge> : "—"}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <TrainingRowActions training={t} />
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