import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { APPROVAL_THRESHOLD_READ_ROLES } from "@/lib/auth/navigation"
import { ApprovalThresholdDialog } from "./approval-threshold-dialog"
import { ApprovalThresholdRowActions } from "./approval-threshold-row-actions"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function currency(v: number | null) {
  return v != null ? v.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }) : "Tidak terbatas"
}

export default async function ApprovalThresholdsPage() {
  // Read separation (mirrors 0040 RLS SELECT): Sales/Operations never reach this page.
  const ctx = await requireRole(...APPROVAL_THRESHOLD_READ_ROLES)
  const canManage = hasAnyRole(ctx.roles, ["FINANCE", "ADMIN"])

  const supabase = await createClient()
  const { data: thresholds, error } = await supabase
    .from("approval_thresholds")
    .select("id, context, approver_role, min_amount, max_amount, sort_order, is_active")
    .order("context")
    .order("sort_order")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Konfigurasi tingkat persetujuan budget & expense berdasarkan nominal (§14.7)
        </p>
        {canManage && <ApprovalThresholdDialog />}
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && thresholds?.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada konfigurasi tingkat persetujuan.
        </p>
      )}

      {thresholds && thresholds.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Konteks</TableHead>
              <TableHead>Urutan</TableHead>
              <TableHead>Batas Bawah</TableHead>
              <TableHead>Batas Atas</TableHead>
              <TableHead>Role Approver</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {thresholds.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Badge variant="outline">{t.context}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.sort_order}</TableCell>
                <TableCell>{currency(t.min_amount)}</TableCell>
                <TableCell>{currency(t.max_amount)}</TableCell>
                <TableCell className="font-medium">{t.approver_role}</TableCell>
                <TableCell>
                  <Badge variant={t.is_active ? "default" : "secondary"}>
                    {t.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <ApprovalThresholdRowActions id={t.id} isActive={t.is_active} />
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
