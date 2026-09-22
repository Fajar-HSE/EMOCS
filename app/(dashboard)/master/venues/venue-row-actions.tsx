"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateVenue } from "@/actions/master-data-actions"
import { VenueDialog, type VenueRow } from "./venue-dialog"
import { Button } from "@/components/ui/button"

export function VenueRowActions({
  venue,
  cities,
}: {
  venue: VenueRow
  cities: { id: string; name: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm(`Hapus venue "${venue.name}"? Batalkan bila venue sudah dipakai di event.`)) return
    startTransition(async () => {
      const result = await deactivateVenue(venue.id)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menghapus venue")
        return
      }
      toast.success("Venue dihapus")
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <VenueDialog venue={venue} cities={cities} />
      <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        Hapus
      </Button>
    </div>
  )
}