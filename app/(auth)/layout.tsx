import { Unbounded } from "next/font/google"
import "./auth-theme.css"

const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

// Login-scoped theme: the attribute lives on #emocs-auth-root, never on
// <html>, so the dashboard is unaffected. System preference applies instantly
// via the prefers-color-scheme block in auth-theme.css; a stored preference
// is picked up by AuthThemeToggle on mount.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="emocs-auth-root" className={`emocs-auth ${unbounded.variable}`}>
      {children}
    </div>
  )
}
