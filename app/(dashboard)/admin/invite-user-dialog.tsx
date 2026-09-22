"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ROLES } from "@/lib/auth/roles"
import { inviteUser } from "@/actions/admin-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const inviteSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  full_name: z.string().min(2, "Nama minimal 2 karakter"),
  roles: z.array(z.enum(ROLES)).min(1, "Pilih minimal 1 role"),
  team_id: z.string().uuid().optional(),
})
type InviteInput = z.infer<typeof inviteSchema>

export function InviteUserDialog({ teams }: { teams: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", full_name: "", roles: [], team_id: undefined },
  })

  async function onSubmit(values: InviteInput) {
    const result = await inviteUser(values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal mengundang user")
      return
    }
    toast.success(result.message ?? "Undangan terkirim")
    form.reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ Undang User</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undang User Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((role) => (
                      <Label key={role} className="flex items-center gap-2 font-normal">
                        <Checkbox
                          checked={field.value.includes(role)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, role]
                                : field.value.filter((r) => r !== role)
                            )
                          }}
                        />
                        {role}
                      </Label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tim Sales</FormLabel>
                  <select
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                  >
                    <option value="">— Tanpa tim —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Mengirim..." : "Kirim Undangan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
