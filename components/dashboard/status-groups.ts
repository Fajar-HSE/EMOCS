import type { Database } from "@/types/database.types"

type EventStatus = Database["public"]["Enums"]["event_status"]

// 16 status EMOCS → 5 kelompok operasional di dashboard (plus Dibatalkan
// kondisional). Satu-satunya tempat mapping ini didefinisikan.
export const STATUS_GROUPS = {
  REQUEST: { label: "Event Request", color: "#2563eb", statuses: ["DRAFT", "SUBMITTED"] },
  REVIEW: {
    label: "Review & Approval",
    color: "#f59e0b",
    statuses: ["UNDER_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED"],
  },
  OPERATIONAL: {
    label: "Operational",
    color: "#10b981",
    statuses: ["PIC_ASSIGNED", "PREPARATION", "READY", "POSTPONED"],
  },
  DELIVERY: {
    label: "Pelaksanaan",
    color: "#8b5cf6",
    statuses: ["RUNNING", "POST_EVENT", "FINANCIAL_CLOSING"],
  },
  DONE: { label: "Selesai", color: "#059669", statuses: ["COMPLETED", "CLOSED"] },
} as const satisfies Record<string, { label: string; color: string; statuses: readonly EventStatus[] }>

export const CANCELLED_GROUP = { label: "Dibatalkan", color: "#ef4444" } as const

export type StatusGroupKey = keyof typeof STATUS_GROUPS | "CANCELLED"

export function groupOf(status: string): StatusGroupKey {
  for (const [key, g] of Object.entries(STATUS_GROUPS)) {
    if ((g.statuses as readonly string[]).includes(status)) return key as StatusGroupKey
  }
  return "CANCELLED"
}

export function groupMeta(key: StatusGroupKey): { label: string; color: string } {
  return key === "CANCELLED" ? CANCELLED_GROUP : STATUS_GROUPS[key]
}

export const ACTIVE_STATUSES = [
  ...STATUS_GROUPS.OPERATIONAL.statuses,
  ...STATUS_GROUPS.DELIVERY.statuses,
] as unknown as EventStatus[]

export const DONE_STATUSES = [...STATUS_GROUPS.DONE.statuses] as unknown as EventStatus[]
