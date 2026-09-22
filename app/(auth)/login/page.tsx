import { LoginForm } from "./login-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signOut } from "@/actions/auth-actions"
import { Button } from "@/components/ui/button"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">EMOCS</h1>
        <p className="text-muted-foreground text-sm">
          Event Management &amp; Operational Control System
        </p>
      </div>

      {error === "not_invited" && (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Alert variant="destructive">
            <AlertDescription>
              Akun Anda belum terdaftar. Hubungi Administrator.
            </AlertDescription>
          </Alert>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="w-full">
              Coba akun lain
            </Button>
          </form>
        </div>
      )}

      {error === "oauth_init_failed" && (
        <Alert variant="destructive" className="w-full max-w-sm">
          <AlertDescription>
            Gagal memulai login Google. Coba lagi atau gunakan email/password.
          </AlertDescription>
        </Alert>
      )}

      <LoginForm next={next} />
    </main>
  )
}
