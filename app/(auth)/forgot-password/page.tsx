import Link from "next/link"
import { ForgotPasswordForm } from "./forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold">Lupa Password</h1>
        <p className="text-muted-foreground text-sm">
          Masukkan email Anda untuk menerima tautan reset password.
        </p>
      </div>
      <ForgotPasswordForm />
      <Link href="/login" className="text-sm text-muted-foreground hover:underline">
        Kembali ke halaman login
      </Link>
    </main>
  )
}
