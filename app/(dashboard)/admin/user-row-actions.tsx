"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ROLES, type Role } from "@/lib/auth/roles"
import { toggleUserActive, updateUserRoles } from "@/actions/admin-actions"
import { adminResetUserMfa } from "@/actions/mfa-actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export function UserRowActions({
  userId,
  isActive,
  currentRoles,
}: {
  userId: string
  isActive: boolean
  currentRoles: Role[]
}) {
  const [pending, startTransition] = useTransition()
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(currentRoles)

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleUserActive(userId, !isActive)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal mengubah status")
        return
      }
      toast.success(isActive ? "User dinonaktifkan" : "User diaktifkan")
    })
  }

  function handleSaveRoles() {
    startTransition(async () => {
      const result = await updateUserRoles(userId, selectedRoles)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal menyimpan role")
        return
      }
      toast.success("Role diperbarui")
      setRoleDialogOpen(false)
    })
  }

  // Stage H recovery path: if a user loses their authenticator device, they
  // can't self-unenroll (Supabase requires aal2 to remove a verified
  // factor — the whole point is a stolen aal1 session can't disable MFA).
  // Admin force-removes it instead; the user re-enrolls on their next
  // FINANCE/ADMIN action.
  function handleResetMfa() {
    if (!window.confirm("Hapus semua faktor MFA user ini? User akan diminta mengaktifkan ulang.")) return
    startTransition(async () => {
      const result = await adminResetUserMfa(userId)
      if (!result.ok) {
        toast.error(result.message ?? "Gagal mereset MFA")
        return
      }
      toast.success(result.message ?? "MFA direset")
    })
  }

  return (
    <div className="flex gap-2">
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <Button variant="outline" size="sm" onClick={() => setRoleDialogOpen(true)}>
          Role
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atur Role</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((role) => (
              <Label key={role} className="flex items-center gap-2 font-normal">
                <Checkbox
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={(checked) => {
                    setSelectedRoles((prev) =>
                      checked ? [...prev, role] : prev.filter((r) => r !== role)
                    )
                  }}
                />
                {role}
              </Label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveRoles} disabled={pending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        variant={isActive ? "outline" : "default"}
        size="sm"
        onClick={handleToggleActive}
        disabled={pending}
      >
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </Button>

      {(currentRoles.includes("FINANCE") || currentRoles.includes("ADMIN")) && (
        <Button variant="ghost" size="sm" onClick={handleResetMfa} disabled={pending}>
          Reset MFA
        </Button>
      )}
    </div>
  )
}
