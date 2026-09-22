"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateEvent } from "@/actions/event-actions"
import { EventEditDialog, type EventEditRow } from "./event-edit-dialog"
import { Button } from "@/components/ui/button"

export function EventRowActions({ event, editable }: { event: EventEditRow; editable: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Hapus event "${event.event_name || "(tanpa nama)"}"? Event akan disembunyikan dari daftar dan pencarian (data tetap tersimpan untuk audit).`)) return
    startTransition(async () => {
      const result = await deactivateEvent(event.id)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menghapus event")
        return
      }
      toast.success("Event dihapus")
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <EventEditDialog event={event} disabled={!editable} />
      <Button size="sm" variant="ghost" disabled={pending || !editable} onClick={handleDelete}>
        Hapus
      </Button>
    </div>
  )
}