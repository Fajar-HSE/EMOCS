"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { cn } from "cn"

/**
 * Kode monospace yang bisa disalin sekali klik (DESIGN.md §12 — Event ID
 * selalu monospace dan dapat disalin). Feedback singkat "tersalin".
 */
export function CopyableCode({
  value,
  className,
  title = "Salin",
}: {
  value: string | null | undefined
  className?: string
  title?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard tidak tersedia (mis. konteks tidak aman) — abaikan diam-diam.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Tersalin" : title}
      aria-label={copied ? "Tersalin" : title}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs transition hover:text-primary",
        className,
      )}
    >
      {value || "—"}
      {copied ? (
        <Check className="h-3 w-3 text-emerald-600" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  )
}
