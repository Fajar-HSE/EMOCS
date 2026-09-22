import Link from "next/link"
import { AuthHero } from "@/components/auth/auth-hero"
import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle"
import { ForgotPasswordForm } from "./forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="shell">
      <AuthHero />

      <main className="panel">
        <div className="panel-top">
          <AuthThemeToggle />
        </div>

        <div className="card-wrap">
          <div className="card">
            <div>
              <p className="eyebrow">Pemulihan akun</p>
              <h1>Lupa Password</h1>
              <p className="lede">Masukkan email Anda untuk menerima tautan reset password.</p>
            </div>

            <ForgotPasswordForm />

            <Link href="/login" className="field-link" style={{ textAlign: "center" }}>
              Kembali ke halaman login
            </Link>
          </div>
        </div>

        <div className="panel-footer">
          <div className="studio-credit">
            <span className="dotset">
              <span />
              <span />
              <span />
            </span>
            Dirancang oleh Studio P26
          </div>
        </div>
      </main>
    </div>
  )
}
