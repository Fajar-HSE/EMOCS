"use client"

import { useState } from "react"
import { FileDiff, SquarePen } from "lucide-react"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils/format"
import { TABLE_LABEL, ACTION_LABEL } from "./audit-tables"

export type AuditRow = {
  id: string
  table_name: string
  action: string
  actor_email: string | null
  actor_user_id: string | null
  record_id: string | null
  changed_fields: string[] | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "boolean") return v ? "ya" : "tidak"
  if (typeof v === "object") return JSON.stringify(v).slice(0, 200)
  return String(v)
}

function ValueDiff({ row }: { row: AuditRow }) {
  const keys = [...new Set([...(row.old_values ? Object.keys(row.old_values) : []), ...(row.new_values ? Object.keys(row.new_values) : [])])]
  if (keys.length === 0) return <p className="text-muted-foreground text-sm">Tidak ada detail nilai.</p>
  return (
    <dl className="space-y-1.5 text-sm">
      {keys.map((k) => {
        const oldV = row.old_values ? row.old_values[k] : undefined
        const newV = row.new_values ? row.new_values[k] : undefined
        const changed = JSON.stringify(oldV) !== JSON.stringify(newV)
        return (
          <div key={k} className="grid grid-cols-3 gap-2">
            <dt className="text-muted-foreground font-mono text-xs break-all">{k}</dt>
            {oldV === undefined ? (
              <dd className="text-muted-foreground">—</dd>
            ) : (
              <dd className={changed ? "text-muted-foreground line-through" : ""}>{stringifyValue(oldV)}</dd>
            )}
            {newV === undefined ? (
              <dd className="text-muted-foreground">—</dd>
            ) : (
              <dd className={changed ? "font-medium" : "text-slate-700"}>{stringifyValue(newV)}</dd>
            )}
          </div>
        )
      })}
    </dl>
  )
}

export function AuditLogList({ rows }: { rows: AuditRow[] }) {
  const [detail, setDetail] = useState<AuditRow | null>(null)

  const columns: Column<AuditRow>[] = [
    {
      header: "Waktu",
      primary: true,
      cell: (r) => (
        <span className="text-sm whitespace-nowrap">{formatDate(r.created_at, "d MMM yyyy, HH:mm")}</span>
      ),
    },
    {
      header: "Tabel",
      primary: true,
      cell: (r) => (
        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
          {TABLE_LABEL[r.table_name] ?? r.table_name}
        </Badge>
      ),
    },
    {
      header: "Aksi",
      className: "hidden md:table-cell",
      cell: (r) => (
        <Badge variant={ACTION_VARIANT[r.action] ?? "outline"}>{ACTION_LABEL[r.action] ?? r.action}</Badge>
      ),
    },
    {
      header: "Aktor",
      className: "hidden lg:table-cell",
      cell: (r) => <span className="text-sm">{r.actor_email ?? "Sistem"}</span>,
    },
    {
      header: "Rekaman",
      className: "hidden xl:table-cell",
      cell: (r) => (
        <span className="font-mono text-xs text-muted-foreground" title={r.record_id ?? ""}>
          {(r.record_id ?? "").slice(0, 8)}…
        </span>
      ),
    },
    {
      header: "Detail",
      primary: true,
      cell: (r) => (
        <Button size="sm" variant="outline" onClick={() => setDetail(r)}>
          {r.changed_fields && r.changed_fields.length > 0 ? `${r.changed_fields.length} field berubah` : "Lihat"}
        </Button>
      ),
    },
  ]

  return (
    <>
      <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Audit</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                  {TABLE_LABEL[detail.table_name] ?? detail.table_name}
                </Badge>
                <Badge variant={ACTION_VARIANT[detail.action] ?? "outline"}>
                  {ACTION_LABEL[detail.action] ?? detail.action}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">{detail.record_id ?? "—"}</span>
              </div>
              <p className="text-muted-foreground">
                {detail.actor_email ?? "Sistem"} ·{" "}
                {formatDate(detail.created_at, "d MMM yyyy, HH:mm:ss")}
              </p>
              {detail.changed_fields && detail.changed_fields.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {detail.changed_fields.map((f) => (
                    <Badge key={f} variant="secondary" className="font-mono text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {detail.action === "DELETE" ? (
                <div className="rounded-md border bg-slate-50 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 font-medium">
                    <SquarePen className="h-3.5 w-3.5" /> Nilai lama
                  </p>
                  <ValueDiff row={detail} />
                </div>
              ) : (
                <div className="rounded-md border bg-slate-50 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 font-medium">
                    <FileDiff className="h-3.5 w-3.5" /> Perbandingan nilai (lama → baru)
                  </p>
                  <ValueDiff row={detail} />
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}