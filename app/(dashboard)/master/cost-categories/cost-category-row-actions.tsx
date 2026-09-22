"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateCostCategory } from "@/actions/financial-actions"
import { Button } from "@/components/ui/button"

export function CostCategoryRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (!isActive) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await deactivateCostCategory(id)
          if (!result.ok) {
            toast.error(result.message ?? "Gagal menonaktifkan kategori")
            return
          }
          router.refresh()
        })
      }
    >
      Nonaktifkan
    </Button>
  )
}
