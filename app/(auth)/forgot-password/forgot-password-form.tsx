"use client"

import { useActionState } from "react"
import { requestPasswordReset, type ActionState } from "@/actions/auth-actions"

const initialState: ActionState = null

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState)

  if (state?.ok) {
    return <p className="auth-alert success">{state.message}</p>
  }

  const emailError = state?.fieldErrors?.email?.[0]

  return (
    <form action={formAction} className="login-form" noValidate>
      {state?.message && <p className="auth-alert">{state.message}</p>}
      <div className={`field${emailError ? " has-error" : ""}`}>
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
            id="email"
            name="email"
            type="email"
            placeholder="nama@perusahaan.com"
            autoComplete="email"
            required
          />
        </div>
        <p className={`field-hint${emailError ? " error" : ""}`}>{emailError ?? ""}</p>
      </div>
      <button
        className={`btn btn-submit${pending ? " is-loading" : ""}`}
        type="submit"
        disabled={pending}
      >
        <span className="label">Kirim tautan reset</span>
        <span className="spinner" aria-hidden="true">
          <span className="ring" />
        </span>
      </button>
    </form>
  )
}
