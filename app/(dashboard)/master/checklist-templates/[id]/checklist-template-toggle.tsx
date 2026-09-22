"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { toggleChecklistTemplateActive } from "@/actions/template-actions"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ChecklistTemplateToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function onCheckedChange(checked: boolean) {
    setPending(true)
    const result = await toggleChecklistTemplateActive(id, checked)
    setPending(false)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal mengubah status template")
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={`active-${id}`}>{isActive ? "Aktif" : "Nonaktif"}</Label>
      <Switch id={`active-${id}`} checked={isActive} onCheckedChange={onCheckedChange} disabled={pending} />
    </div>
  )
}
