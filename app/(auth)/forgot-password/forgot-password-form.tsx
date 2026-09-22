"use client"

import { useActionState } from "react"
import { requestPasswordReset, type ActionState } from "@/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

const initialState: ActionState = null

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState)

  if (state?.ok) {
    return (
      <Alert className="w-full max-w-sm">
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {state?.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && (
          <p className="text-destructive text-sm">{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Mengirim..." : "Kirim tautan reset"}
      </Button>
    </form>
  )
}
