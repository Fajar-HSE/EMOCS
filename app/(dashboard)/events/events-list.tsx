"use client"

import { useRouter } from "next/navigation"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { CopyableCode } from "@/components/shared/copyable-code"
import { EventStatusBadge } from "@/components/shared/event-status-badge"
import { PageProgress } from "@/components/shared/page-progress"
import { formatDate, formatIDR } from "@/lib/utils/format"
import type { Database } from "@/types/database.types"
import { EventRowActions } from "./event-row-actions"
import type { EventEditRow } from "./event-edit-dialog"

type TrackedEvent = EventEditRow & {
  event_code: string | null
  status: Database["public"]["Enums"]["event_status"]
  progress_percentage: number | null
  is_rush: boolean
  sales_user_id: string | null
  customers: { name: string | null } | null
  pic: { full_name: string | null } | null
  sales: { full_name: string | null } | null
  sales_team: { name: string | null } | null
}

export function EventsList({
  rows,
  currentUserId,
  canSeeAllSalesValue,
  canEditEvents,
  isManagerOrAdmin,
  userTeamId,
}: {
  rows: TrackedEvent[]
  currentUserId: string
  canSeeAllSalesValue: boolean
  canEditEvents: boolean
  isManagerOrAdmin: boolean
  userTeamId: string | null
}) {
  const router = useRouter()

  // Menyamai scope RLS events_update: ADMIN/OM semua status non-CLOSED;
  // SALES_MANAGER hanya event timnya yang berstatus SUBMITTED/REVISION_REQUESTED.
  function rowEditable(e: TrackedEvent): boolean {
    if (isManagerOrAdmin) return e.status !== "CLOSED"
    if (e.status !== "SUBMITTED" && e.status !== "REVISION_REQUESTED") return false
    return (userTeamId ?? null) === e.sales_team_id
  }

  const columns: Column<TrackedEvent>[] = [
    {
      header: "Event ID",
      primary: true,
      className: "w-44",
      cell: (e) => (
        <div className="flex items-center gap-1.5">
          <CopyableCode value={e.event_code} />
          {e.is_rush ? (
            <Badge variant="destructive" className="shrink-0">
              RUSH
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      header: "Nama",
      primary: true,
      cell: (e) => <span className="max-w-48 truncate font-medium">{e.event_name || "—"}</span>,
    },
    {
      header: "Customer",
      primary: true,
      cell: (e) => e.customers?.name ?? "—",
    },
    {
      header: "Tanggal",
      primary: true,
      cell: (e) => formatDate(e.start_date),
    },
    {
      header: "Status",
      primary: true,
      cell: (e) => <EventStatusBadge status={e.status} />,
    },
    {
      header: "Progress",
      primary: true,
      cell: (e) => <PageProgress value={e.progress_percentage} className="max-w-40" />,
    },
    {
      header: "PIC",
      className: "hidden md:table-cell",
      cell: (e) => e.pic?.full_name ?? "—",
    },
    {
      header: "Sales",
      className: "hidden md:table-cell",
      cell: (e) => e.sales?.full_name ?? "—",
    },
    {
      header: "Tim Sales",
      className: "hidden md:table-cell",
      cell: (e) => e.sales_team?.name ?? "—",
    },
    {
      header: "Nilai",
      className: "hidden md:table-cell",
      cell: (e) =>
        canSeeAllSalesValue || e.sales_user_id === currentUserId
          ? formatIDR(e.sales_value)
          : "—",
    },
    ...(canEditEvents
      ? [
          {
            header: "Aksi",
            primary: true,
            className: "w-28 text-right",
            cell: (e: TrackedEvent) => <EventRowActions event={e} editable={rowEditable(e)} />,
          },
        ]
      : []),
  ]

  return (
    <DataTable<TrackedEvent>
      columns={columns}
      rows={rows}
      rowKey={(e) => e.id}
      onRowClick={(e) => router.push(`/events/${e.id}`)}
    />
  )
}