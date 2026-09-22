"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { toggleEventChecklistItem } from "@/actions/checklist-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "cn"

type ChecklistItem = {
  id: string
  category: string | null
  label: string
  is_mandatory: boolean
  is_done: boolean
}

export function ChecklistPanel({
  eventId,
  items,
  canManage,
}: {
  eventId: string
  items: ChecklistItem[]
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()

  function handleToggle(itemId: string, checked: boolean) {
    startTransition(async () => {
      const result = await toggleEventChecklistItem(itemId, eventId, checked)
      if (!result.ok) toast.error(result.message ?? "Gagal mengubah status checklist")
    })
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Belum ada checklist. Checklist otomatis dibuat dari template yang paling cocok saat PIC
        ditugaskan.
      </p>
    )
  }

  const mandatoryTotal = items.filter((i) => i.is_mandatory).length
  const mandatoryDone = items.filter((i) => i.is_mandatory && i.is_done).length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {mandatoryDone}/{mandatoryTotal} item wajib selesai · {items.filter((i) => i.is_done).length}/
        {items.length} total
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 rounded-md border p-2">
            <Checkbox
              checked={item.is_done}
              onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
              disabled={!canManage || pending}
              className="mt-0.5"
            />
            <div className="flex-1">
              <span className={cn("text-sm", item.is_done && "text-muted-foreground line-through")}>
                {item.label}
              </span>
              {item.is_mandatory && (
                <Badge variant="secondary" className="ml-1">
                  Wajib
                </Badge>
              )}
              {item.category && <p className="text-muted-foreground text-xs">{item.category}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
