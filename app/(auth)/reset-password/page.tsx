import { ResetPasswordForm } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold">Atur Password Baru</h1>
      </div>
      <ResetPasswordForm />
    </main>
  )
}
