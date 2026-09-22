import type { Database } from "@/types/database.types"
import { EVENT_STATUS_LABELS } from "@/lib/validations/labels"

export type EventStatus = Database["public"]["Enums"]["event_status"]

// Status default "Aktif": semua tahap sebelum selesai/dibatalkan (tidak termasuk DRAFT).
export const ACTIVE_STATUSES: EventStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED",
  "PIC_ASSIGNED",
  "PREPARATION",
  "READY",
  "RUNNING",
]

export const OTHER_STATUSES: EventStatus[] = [
  "COMPLETED",
  "POST_EVENT",
  "CLOSED",
  "CANCELLED",
  "POSTPONED",
  "REJECTED",
]

// Opsi filter status (Base UI Select butuh { value, label } agar label ter-resolve).
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "ALL", label: "Semua status" },
  ...[...ACTIVE_STATUSES, ...OTHER_STATUSES].map((s) => ({
    value: s,
    label: EVENT_STATUS_LABELS[s] ?? s,
  })),
]