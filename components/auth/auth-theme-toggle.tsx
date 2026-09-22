"use client"

import { useSyncExternalStore } from "react"

const STORAGE_KEY = "emocs-theme"
const ROOT_ID = "emocs-auth-root"

type Theme = "dark" | "light"

function readTheme(): Theme {
  const attr = document.getElementById(ROOT_ID)?.getAttribute("data-theme")
  if (attr === "dark" || attr === "light") return attr
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "dark" || stored === "light") return stored
  } catch {
    /* private mode — fall through to OS preference */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

// Same-document toggles don't fire a "storage" event, so local subscribers
// are notified explicitly. OS-preference and cross-tab changes arrive via
// matchMedia / storage listeners below.
const localSubscribers = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  localSubscribers.add(onChange)
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", onChange)
  window.addEventListener("storage", onChange)
  return () => {
    localSubscribers.delete(onChange)
    mq.removeEventListener("change", onChange)
    window.removeEventListener("storage", onChange)
  }
}

function getServerSnapshot(): Theme {
  return "light"
}

/** Login-scoped Terang/Gelap toggle. Touches only #emocs-auth-root. */
export function AuthThemeToggle() {
  // External-store subscription (not setState-in-effect): the sanctioned
  // primitive for localStorage/media-query state. suppressHydrationWarning
  // below is intentional — first client paint may legitimately differ from
  // SSR when a theme was stored (same pattern as next-themes).
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot)

  function toggle() {
    const next: Theme = readTheme() === "dark" ? "light" : "dark"
    document.getElementById(ROOT_ID)?.setAttribute("data-theme", next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode — theme just won't persist */
    }
    localSubscribers.forEach((notify) => notify())
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label="Ganti tema tampilan"
      suppressHydrationWarning
    >
      <span className="swatch">
        {theme === "dark" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#12172e" strokeWidth="2.4" strokeLinecap="round">
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="#12172e" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
          </svg>
        )}
      </span>
      <span>{theme === "dark" ? "Gelap" : "Terang"}</span>
    </button>
  )
}
