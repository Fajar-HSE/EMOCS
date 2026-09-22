import { AuthHero } from "@/components/auth/auth-hero"
import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle"
import { ResetPasswordForm } from "./reset-password-form"

export default function ResetPasswordPage() {
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
              <h1>Atur Password Baru</h1>
              <p className="lede">Buat password baru untuk akun Anda.</p>
            </div>

            <ResetPasswordForm />
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
