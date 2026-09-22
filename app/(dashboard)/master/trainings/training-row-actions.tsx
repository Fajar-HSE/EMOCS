"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateTraining } from "@/actions/master-data-actions"
import { TrainingDialog, type TrainingRow } from "./training-dialog"
import { Button } from "@/components/ui/button"

export function TrainingRowActions({ training }: { training: TrainingRow }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm(`Hapus training "${training.name}"? Batalkan bila training sudah dipakai di event.`)) return
    startTransition(async () => {
      const result = await deactivateTraining(training.id)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menghapus training")
        return
      }
      toast.success("Training dihapus")
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <TrainingDialog training={training} />
      <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        Hapus
      </Button>
    </div>
  )
}