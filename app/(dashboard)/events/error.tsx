"use client"

import { ErrorState } from "@/components/shared/error-state"

export default function EventsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-6">
      <ErrorState
        title="Daftar event gagal dimuat"
        message="Terjadi kesalahan saat memuat daftar event. Periksa koneksi Anda, lalu coba lagi."
        onRetry={reset}
      />
    </div>
  )
}
