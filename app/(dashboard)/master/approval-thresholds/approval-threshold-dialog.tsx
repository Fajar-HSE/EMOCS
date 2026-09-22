"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { approvalThresholdSchema, type ApprovalThresholdInput } from "@/lib/validations/approval-threshold"
import { createApprovalThreshold } from "@/actions/financial-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const CONTEXTS = ["EXPENSE", "BUDGET"] as const
const APPROVER_ROLES = ["OPERATIONS", "OPERATIONS_MANAGER", "FINANCE", "MANAGEMENT", "ADMIN"] as const

export function ApprovalThresholdDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const form = useForm<ApprovalThresholdInput>({
    resolver: zodResolver(approvalThresholdSchema),
    defaultValues: { context: "EXPENSE", approver_role: "OPERATIONS", min_amount: 0, sort_order: 1 },
  })

  async function onSubmit(values: ApprovalThresholdInput) {
    const result = await createApprovalThreshold(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan konfigurasi")
      return
    }
    toast.success("Tingkat persetujuan baru tersimpan")
    form.reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ Tingkat baru</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tingkat Persetujuan Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konteks</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={CONTEXTS.map((c) => ({ value: c, label: c }))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTEXTS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="approver_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Approver</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={APPROVER_ROLES.map((r) => ({ value: r, label: r }))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {APPROVER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batas Bawah (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batas Atas (Rp, kosongkan = tak terbatas)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urutan Tingkat (1 = terendah)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value ?? 1}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
