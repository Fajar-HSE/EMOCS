"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateTrainer } from "@/actions/master-data-actions"
import { TrainerDialog, type TrainerRow } from "./trainer-dialog"
import { Button } from "@/components/ui/button"

export function TrainerRowActions({
  trainer,
  cities,
}: {
  trainer: TrainerRow
  cities: { id: string; name: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm(`Hapus trainer "${trainer.full_name}"? Batalkan bila trainer sudah ditugaskan ke event.`)) return
    startTransition(async () => {
      const result = await deactivateTrainer(trainer.id)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menghapus trainer")
        return
      }
      toast.success("Trainer dihapus")
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <TrainerDialog trainer={trainer} cities={cities} />
      <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        Hapus
      </Button>
    </div>
  )
}