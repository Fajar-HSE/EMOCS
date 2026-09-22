"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deactivateCustomer } from "@/actions/master-data-actions"
import { CustomerDialog, type CustomerWithContact } from "./customer-dialog"
import { Button } from "@/components/ui/button"

export function CustomerRowActions({ customer }: { customer: CustomerWithContact }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm(`Hapus customer "${customer.name}"? Batalkan bila customer sudah dipakai di event.`)) return
    startTransition(async () => {
      const result = await deactivateCustomer(customer.id)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menghapus customer")
        return
      }
      toast.success("Customer dihapus")
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-1">
      <CustomerDialog customer={customer} />
      <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        Hapus
      </Button>
    </div>
  )
}
