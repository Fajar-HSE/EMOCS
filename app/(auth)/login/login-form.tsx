"use client"

import { useState } from "react"
import { useActionState } from "react"
import Link from "next/link"
import { signInWithPassword, signInWithGoogle, type ActionState } from "@/actions/auth-actions"

const initialState: ActionState = null
const REMEMBER_KEY = "emocs-remember-email"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState)

  // Remembered email is read lazily at first client render (never in an
  // effect). It may differ from SSR output, hence suppressHydrationWarning
  // on the inputs below. localStorage holds the email only — the session
  // itself stays in Supabase cookies.
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return ""
    try {
      return localStorage.getItem(REMEMBER_KEY) ?? ""
    } catch {
      return ""
    }
  })
  const [remember, setRemember] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem(REMEMBER_KEY) !== null
    } catch {
      return false
    }
  })
  const [emailTouched, setEmailTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)

  function persistEmail() {
    try {
      if (remember && EMAIL_PATTERN.test(email.trim())) {
        localStorage.setItem(REMEMBER_KEY, email.trim())
      } else if (!remember) {
        localStorage.removeItem(REMEMBER_KEY)
      }
    } catch {
      /* ignore */
    }
  }

  const serverEmailError = state?.fieldErrors?.email?.[0]
  const serverPasswordError = state?.fieldErrors?.password?.[0]
  const emailValid = EMAIL_PATTERN.test(email.trim())
  const emailClientError =
    !serverEmailError && emailTouched && email.trim() !== "" && !emailValid
      ? "Format email tidak valid"
      : null
  const emailHint = serverEmailError ?? emailClientError
  const emailOk = !emailHint && emailTouched && emailValid

  return (
    <>
      <form
        action={async () => {
          await signInWithGoogle(next)
        }}
      >
        <button className="btn btn-google" type="submit">
          <GoogleIcon />
          Masuk dengan Google
        </button>
      </form>

      <div className="divider">atau</div>

      <form action={formAction} onSubmit={persistEmail} className="login-form" noValidate>
        {state?.message && <p className="auth-alert">{state.message}</p>}

        <div className={`field${emailHint ? " has-error" : emailOk ? " has-success" : ""}`}>
          <label htmlFor="email">Email</label>
          <div className="input-wrap">
            <svg
              className="icon-leading"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="nama@perusahaan.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              suppressHydrationWarning
            />
          </div>
          <p className={`field-hint${emailHint ? " error" : emailOk ? " success" : ""}`}>
            {emailHint ?? (emailOk ? "Terlihat baik" : "")}
          </p>
        </div>

        <div className={`field${serverPasswordError ? " has-error" : ""}`}>
          <div className="field-row">
            <label htmlFor="password">Password</label>
            <Link href="/forgot-password" className="field-link">
              Lupa password?
            </Link>
          </div>
          <div className="input-wrap">
            <svg
              className="icon-leading"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.3" />
              <path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" />
            </svg>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              placeholder="Masukkan password"
              autoComplete="current-password"
              required
              minLength={6}
              data-has-toggle="true"
              onKeyUp={(e) => {
                const on =
                  typeof e.getModifierState === "function" && e.getModifierState("CapsLock")
                setCapsOn(on)
              }}
            />
            <button
              className={`toggle-visibility${showPassword ? " is-visible" : ""}`}
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              <svg
                className="icon-on"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg
                className="icon-off"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c7 0 10.5 7 10.5 7a13.3 13.3 0 0 1-3.1 3.9M6.6 6.6C3.4 8.6 1.5 12 1.5 12s3.5 7 10.5 7c1.4 0 2.7-.28 3.9-.77" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </svg>
            </button>
          </div>
          <p
            className={`field-hint${serverPasswordError ? " error" : capsOn ? " warn" : ""}`}
          >
            {serverPasswordError ?? (capsOn ? "Caps Lock aktif" : "")}
          </p>
        </div>

        <div className="row-between">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              suppressHydrationWarning
            />
            <span className="box">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12l5 5L20 6" />
              </svg>
            </span>
            Ingat email saya
          </label>
        </div>

        <button className={`btn btn-submit${pending ? " is-loading" : ""}`} type="submit" disabled={pending}>
          <span className="label">Masuk</span>
          <span className="spinner" aria-hidden="true">
            <span className="ring" />
          </span>
        </button>

        <p className="fine-print">
          Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi EMOCS.
        </p>
      </form>
    </>
  )
}
