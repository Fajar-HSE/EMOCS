"use client"

import { cn } from "cn"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type Column<T> = {
  header: string
  cell: (row: T) => React.ReactNode
  /** Diterapkan ke th & td — mis. "hidden md:table-cell" untuk kolom sekunder. */
  className?: string
  /** Muncul di kartu mobile (DESIGN.md §9.1 — mobile hanya kolom kritis). */
  primary?: boolean
}

/**
 * Tabel responsif standar: tabel di desktop, kartu di mobile (360px).
 * Kolom tanpa `primary` disembunyikan di mobile via `hidden md:table-cell`.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  className?: string
}) {
  const primary = columns.filter((c) => c.primary)
  const mobileColumns = primary.length > 0 ? primary : columns

  return (
    <>
      <div className={cn("hidden md:block", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.header} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((col) => (
                  <TableCell key={`${col.header}-${rowKey(row)}`} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(onRowClick && "cursor-pointer")}
          >
            <CardContent className="px-4 py-3.5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {mobileColumns.map((col) => (
                  <div key={col.header} className="space-y-0.5">
                    <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {col.header}
                    </dt>
                    <dd className="text-sm">{col.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
