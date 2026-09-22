export const AUDIT_TABLES = [
  { key: "events", label: "Event" },
  { key: "event_tasks", label: "Task" },
  { key: "expenses", label: "Expense" },
  { key: "event_budgets", label: "Budget" },
  { key: "event_budget_items", label: "Item Budget" },
  { key: "customers", label: "Customer" },
  { key: "customer_contacts", label: "Kontak" },
  { key: "trainings", label: "Program" },
  { key: "cities", label: "Kota" },
  { key: "profiles", label: "Profil" },
  { key: "user_roles", label: "Role User" },
  { key: "invited_emails", label: "Undangan" },
  { key: "attachments", label: "Lampiran" },
  { key: "trainers", label: "Trainer" },
  { key: "trainer_assignments", label: "Penugasan Trainer" },
  { key: "venues", label: "Venue" },
  { key: "venue_bookings", label: "Booking Venue" },
  { key: "equipment", label: "Perlengkapan" },
  { key: "equipment_assignments", label: "Penugasan Perlengkapan" },
  { key: "event_issues", label: "Issue" },
  { key: "documents", label: "Dokumen" },
  { key: "participants", label: "Peserta" },
] as const

export const TABLE_LABEL: Record<string, string> = Object.fromEntries(
  AUDIT_TABLES.map((t) => [t.key, t.label]),
)

export const ACTION_LABEL: Record<string, string> = {
  INSERT: "Tambah",
  UPDATE: "Ubah",
  DELETE: "Hapus",
}

export const PAGE_ROLES = ["ADMIN", "MANAGEMENT", "OPERATIONS_MANAGER"] as const