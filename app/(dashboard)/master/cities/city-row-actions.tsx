"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateCity } from "@/actions/master-data-actions"
import { CityDialog, type CityRow } from "./city-dialog"
import { Button } from "@/components/ui/button"

export function CityRowActions({ city }: { city: CityRow }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm(`Hapus kota "${city.name}"? Batalkan bila kota sudah dipakai di event.`)) return
    startTransition(async () => {
      const result = await deactivateCity(city.id)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menghapus kota")
        return
      }
      toast.success("Kota dihapus")
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <CityDialog city={city} />
      <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        Hapus
      </Button>
    </div>
  )
}