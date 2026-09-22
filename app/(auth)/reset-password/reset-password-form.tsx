"use client"

import { useActionState } from "react"
import { updatePassword, type ActionState } from "@/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

const initialState: ActionState = null

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState)

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        <Label htmlFor="password">Password baru</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        {state?.fieldErrors?.password && (
          <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Konfirmasi password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        {state?.fieldErrors?.confirmPassword && (
          <p className="text-destructive text-sm">{state.fieldErrors.confirmPassword[0]}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Menyimpan..." : "Simpan password baru"}
      </Button>
    </form>
  )
}
