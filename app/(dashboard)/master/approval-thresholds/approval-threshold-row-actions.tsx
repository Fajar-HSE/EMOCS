"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateApprovalThreshold } from "@/actions/financial-actions"
import { Button } from "@/components/ui/button"

export function ApprovalThresholdRowActions({ id, isActive }: { id: string; isActive: boolean }) {
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
          const result = await deactivateApprovalThreshold(id)
          if (!result.ok) {
            toast.error(result.message ?? "Gagal menonaktifkan")
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
