"use client"

import { useActionState } from "react"
import Link from "next/link"
import { signInWithPassword, signInWithGoogle, type ActionState } from "@/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

const initialState: ActionState = null

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState)

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <form
        action={async () => {
          await signInWithGoogle(next)
        }}
      >
        <Button type="submit" variant="outline" className="w-full">
          Masuk dengan Google
        </Button>
      </form>

      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <div className="h-px flex-1 bg-border" />
        atau
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
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

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
              Lupa password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
          {state?.fieldErrors?.password && (
            <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Memproses..." : "Masuk"}
        </Button>
      </form>
    </div>
  )
}
