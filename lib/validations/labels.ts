import type { Database } from "@/types/database.types"

// Label Indonesia untuk semua enum — single source of truth (pola EVENT_TYPE_LABELS).
// Dipakai di badge, filter, select, timeline, dan tabel. Fallback di UI:
//   LABELS[v] ?? v  (jika nilai belum dikenal, tampil mentah).

type EventStatus = Database["public"]["Enums"]["event_status"]

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  UNDER_REVIEW: "Dalam Review",
  REVISION_REQUESTED: "Revisi Diminta",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  PIC_ASSIGNED: "PIC Ditugaskan",
  PREPARATION: "Persiapan",
  READY: "Siap",
  RUNNING: "Berlangsung",
  COMPLETED: "Selesai",
  POST_EVENT: "Pasca Event",
  FINANCIAL_CLOSING: "Closing Finansial",
  CLOSED: "Ditutup",
  CANCELLED: "Dibatalkan",
  POSTPONED: "Ditunda",
}

export const DELIVERY_MODE_LABELS = {
  OFFLINE: "Offline",
  ONLINE: "Online",
  HYBRID: "Hybrid",
} as const

export const LOCATION_TYPE_LABELS = {
  CLIENT_SITE: "Lokasi Klien",
  HOTEL: "Hotel",
  OFFICE: "Kantor Kami",
  ONLINE: "Online",
  OTHER: "Lainnya",
} as const

export const PO_STATUS_LABELS = {
  NO_PO: "Tanpa PO",
  PO_PENDING: "PO dalam Proses",
  PO_RECEIVED: "PO Diterima",
  VERBAL_COMMITMENT: "Komitmen Verbal",
} as const

export const PAYMENT_TERM_LABELS = {
  DP: "Uang Muka (DP)",
  FULL_BEFORE: "Bayar di Muka",
  NET_14: "Net 14 Hari",
  NET_30: "Net 30 Hari",
  OTHER: "Lainnya",
} as const

export const PRIORITY_LABELS = {
  LOW: "Rendah",
  NORMAL: "Normal",
  HIGH: "Tinggi",
  URGENT: "Urgent",
} as const

export const TASK_PRIORITY_LABELS = {
  LOW: "Rendah",
  NORMAL: "Normal",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
} as const

export const CANCEL_CATEGORY_LABELS = {
  CUSTOMER_CANCELLED: "Dibatalkan Customer",
  INTERNAL_CANCELLED: "Dibatalkan Internal",
  FORCE_MAJEURE: "Force Majeure",
  DUPLICATE: "Duplikat",
  OTHER: "Lainnya",
} as const

export const ISSUE_CATEGORY_LABELS = {
  TRAINER: "Trainer",
  VENUE: "Venue",
  PARTICIPANT: "Peserta",
  EQUIPMENT: "Peralatan",
  MATERIAL: "Materi",
  CUSTOMER: "Customer",
  LOGISTIC: "Logistik",
  FINANCE: "Keuangan",
  OTHER: "Lainnya",
} as const

export const ISSUE_SEVERITY_LABELS = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
} as const

export const TRAINER_ROLE_LABELS = {
  MAIN: "Trainer Utama",
  CO_TRAINER: "Co-Trainer",
  ASSESSOR: "Asesor",
  BACKUP: "Backup",
} as const

export const TRAINER_STATUS_LABELS = {
  REQUESTED: "Diminta",
  AVAILABLE: "Tersedia",
  ASSIGNED: "Ditugaskan",
  CONFIRMED: "Terkonfirmasi",
  CANCELLED: "Dibatalkan",
  REPLACED: "Diganti",
} as const

export const TRAINER_TYPE_LABELS = {
  INTERNAL: "Internal",
  ASSOCIATE: "Asosiasi",
  FREELANCE: "Freelance",
} as const

export const VENUE_STATUS_LABELS = {
  INQUIRY: "Inquiry",
  HOLD: "Hold",
  BOOKED: "Dipesan",
  CONFIRMED: "Terkonfirmasi",
  CANCELLED: "Dibatalkan",
} as const

export const EQUIPMENT_STATUS_LABELS = {
  PLANNED: "Direncanakan",
  PREPARED: "Disiapkan",
  IN_USE: "Digunakan",
  RETURNED: "Dikembalikan",
} as const

export const DOCUMENT_TYPE_LABELS = {
  PROPOSAL: "Proposal",
  PO: "PO",
  INVOICE: "Invoice",
  ATTENDANCE: "Absensi",
  MATERIAL: "Materi",
  CERTIFICATE: "Sertifikat",
  PHOTO: "Dokumentasi",
  EVENT_REPORT: "Laporan Event",
  EXPENSE_RECEIPT: "Bukti Pengeluaran",
  CONTRACT: "Kontrak",
  OTHER: "Lainnya",
} as const

export const DOC_VERIFY_LABELS = {
  PENDING: "Menunggu",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
} as const

export const CHANGE_REQUEST_STATUS_LABELS = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
} as const

export const PAYMENT_METHOD_LABELS = {
  CASH_ADVANCE: "Uang Muka Kas",
  REIMBURSEMENT: "Reimbursement",
  TRANSFER: "Transfer",
  COMPANY_CARD: "Kartu Perusahaan",
} as const

// registration_status adalah kolom teks bebas, bukan enum DB. Label dikenal saja;
// nilai lain tetap tampil mentah.
export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  REGISTERED: "Terdaftar",
  CONFIRMED: "Terkonfirmasi",
  DENIED: "Ditolak",
  WAITLIST: "Menunggu",
  CANCELLED: "Dibatalkan",
}