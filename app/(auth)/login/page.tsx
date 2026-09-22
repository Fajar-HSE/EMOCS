import { AuthHero } from "@/components/auth/auth-hero"
import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle"
import { signOut } from "@/actions/auth-actions"
import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

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
              <p className="eyebrow">Selamat datang kembali</p>
              <h1>Masuk ke akun Anda</h1>
              <p className="lede">Kelola acara, tugas kru, dan anggaran Anda dari satu tempat.</p>
            </div>

            {error === "not_invited" && (
              <div>
                <p className="auth-alert">
                  Akun Anda belum terdaftar. Hubungi Administrator.
                </p>
                <form action={signOut} className="login-form" style={{ marginTop: 12 }}>
                  <button className="btn btn-google" type="submit">
                    Coba akun lain
                  </button>
                </form>
              </div>
            )}

            {error === "oauth_init_failed" && (
              <p className="auth-alert">
                Gagal memulai login Google. Coba lagi atau gunakan email/password.
              </p>
            )}

            <LoginForm next={next} />
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
