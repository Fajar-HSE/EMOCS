"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * Error state standar (DESIGN.md §9.4): Alert + pesan Bahasa Indonesia yang
 * dapat ditindaklanjuti + tombol "Coba Lagi". Tidak pernah menampilkan pesan
 * error mentah dari database (System_Design §11 — error hygiene).
 */
export function ErrorState({
  title = "Gagal memuat data",
  message = "Terjadi kesalahan. Silakan coba beberapa saat lagi.",
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw />
          Coba Lagi
        </Button>
      ) : null}
    </div>
  )
}
