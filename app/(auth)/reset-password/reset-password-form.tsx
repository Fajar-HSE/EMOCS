"use client"

import { useActionState } from "react"
import { updatePassword, type ActionState } from "@/actions/auth-actions"

const initialState: ActionState = null

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState)

  const passwordError = state?.fieldErrors?.password?.[0]
  const confirmError = state?.fieldErrors?.confirmPassword?.[0]

  return (
    <form action={formAction} className="login-form" noValidate>
      {state?.message && <p className="auth-alert">{state.message}</p>}
      <div className={`field${passwordError ? " has-error" : ""}`}>
        <label htmlFor="password">Password baru</label>
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
            id="password"
            name="password"
            type="password"
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
            required
          />
        </div>
        <p className={`field-hint${passwordError ? " error" : ""}`}>{passwordError ?? ""}</p>
      </div>
      <div className={`field${confirmError ? " has-error" : ""}`}>
        <label htmlFor="confirmPassword">Konfirmasi password</label>
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
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Ulangi password baru"
            autoComplete="new-password"
            required
          />
        </div>
        <p className={`field-hint${confirmError ? " error" : ""}`}>{confirmError ?? ""}</p>
      </div>
      <button
        className={`btn btn-submit${pending ? " is-loading" : ""}`}
        type="submit"
        disabled={pending}
      >
        <span className="label">Simpan password baru</span>
        <span className="spinner" aria-hidden="true">
          <span className="ring" />
        </span>
      </button>
    </form>
  )
}
