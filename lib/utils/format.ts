import { format, isValid, parseISO } from "date-fns"
import { id as idLocale } from "date-fns/locale"

/**
 * Format tanggal ke Bahasa Indonesia, mis. "12 Okt 2026".
 * Menerima string ISO (kolom `date`/`timestamptz` Postgres) atau objek Date.
 */
export function formatDate(
  input: string | Date | null | undefined,
  pattern = "d MMM yyyy",
): string {
  if (input == null || input === "") return "—"
  const date = typeof input === "string" ? parseISO(input) : input
  if (!isValid(date)) return "—"
  return format(date, pattern, { locale: idLocale })
}

/** Format uang rupiah, mis. "Rp 1.500.000" (tanpa desimal). */
export function formatIDR(input: number | string | null | undefined): string {
  if (input == null || input === "") return "—"
  const n = typeof input === "string" ? Number(input) : input
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)
}

/** Persen progress dengan angka stabil (tabular-nums), selalu dijeda 0-100. */
export function formatProgress(value: number | null | undefined): number {
  const v = Math.round(Number(value ?? 0))
  return Math.max(0, Math.min(100, v))
}
