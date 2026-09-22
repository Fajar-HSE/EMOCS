import Link from "next/link"

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Tautan tidak valid atau kedaluwarsa</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Coba login kembali, atau minta tautan baru jika ini adalah proses reset password.
      </p>
      <Link href="/login" className="text-sm underline">
        Kembali ke halaman login
      </Link>
    </main>
  )
}
