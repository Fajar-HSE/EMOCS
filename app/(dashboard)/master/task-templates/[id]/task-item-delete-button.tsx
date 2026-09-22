"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteTaskTemplateItem } from "@/actions/template-actions"
import { Button } from "@/components/ui/button"

export function TaskItemDeleteButton({ itemId, templateId }: { itemId: string; templateId: string }) {
  const router = useRouter()

  async function onDelete() {
    if (!window.confirm("Hapus item task ini dari template?")) return
    const result = await deleteTaskTemplateItem(itemId, templateId)
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
