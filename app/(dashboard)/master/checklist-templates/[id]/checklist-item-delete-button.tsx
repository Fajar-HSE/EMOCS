"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteChecklistTemplateItem } from "@/actions/template-actions"
import { Button } from "@/components/ui/button"

export function ChecklistItemDeleteButton({ itemId, templateId }: { itemId: string; templateId: string }) {
  const router = useRouter()

  async function onDelete() {
    if (!window.confirm("Hapus item checklist ini dari template?")) return
    const result = await deleteChecklistTemplateItem(itemId, templateId)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menghapus item")
      return
    }
    router.refresh()
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
      Hapus
    </Button>
  )
}
