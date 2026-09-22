"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateEquipment } from "@/actions/master-data-actions"
import { EquipmentDialog, type EquipmentRow } from "./equipment-dialog"
import { Button } from "@/components/ui/button"

export function EquipmentRowActions({ equipment }: { equipment: EquipmentRow }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm(`Hapus equipment "${equipment.name}"? Batalkan bila equipment sudah ditugaskan ke event.`)) return
    startTransition(async () => {
      const result = await deactivateEquipment(equipment.id)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menghapus equipment")
        return
      }
      toast.success("Equipment dihapus")
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <EquipmentDialog equipment={equipment} />
      <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        Hapus
      </Button>
    </div>
  )
}