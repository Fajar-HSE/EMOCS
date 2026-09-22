import type { Database } from "@/types/database.types"
import { EVENT_STATUS_LABELS } from "@/lib/validations/labels"
import { groupMeta, groupOf } from "@/components/dashboard/status-groups"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type EventStatus = Database["public"]["Enums"]["event_status"]

// Satu-satunya tempat status event dirender sebagai badge berwarna — dipakai
// di Events List, Event Detail, dan Timeline. Warna diambil dari
// STATUS_GROUPS (components/dashboard/status-groups.ts), skema yang sama
// dengan status donut di dashboard, supaya tidak ada palet warna kedua.
export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus | string
  className?: string
}) {
  const meta = groupMeta(groupOf(status))
  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", className)}
      style={{
        backgroundColor: `${meta.color}1a`,
        color: meta.color,
        borderColor: `${meta.color}40`,
      }}
    >
      {EVENT_STATUS_LABELS[status as EventStatus] ?? status}
    </Badge>
  )
}
