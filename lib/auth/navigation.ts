// Single source of truth for role-based navigation visibility.
//
// Background: sidebar (desktop), top nav (mobile), and the Master Data tab
// bar each hard-coded their own role lists, and the tab bar had none at all —
// so Sales saw all 11 master tabs. Every nav surface must derive visibility
// from this module instead of inline role arrays.
//
// Pure module on purpose: no server-only / client-only imports, only a type
// import (erased at compile time). Safe to import from Server Components,
// "use client" components, and node:test regression tests.
import type { Role } from "./roles"

/** Roles entitled to the full Master Data section (sidebar item, mobile link, all tabs). */
export const MASTER_DATA_ROLES: Role[] = [
  "OPERATIONS_MANAGER",
  "FINANCE",
  "ADMIN",
  "MANAGEMENT",
]

/** Roles entitled to the standalone Customer entry (sidebar item, mobile link). */
export const CUSTOMER_NAV_ROLES: Role[] = ["SALES", "SALES_MANAGER"]

/**
 * Roles allowed to READ approval_thresholds (mirrors 0040 RLS SELECT policy).
 * Threshold routing itself runs inside SECURITY DEFINER functions, so runtime
 * approval flows never depend on this list — it only governs direct reads.
 */
export const APPROVAL_THRESHOLD_READ_ROLES: Role[] = [
  "OPERATIONS_MANAGER",
  "FINANCE",
  "MANAGEMENT",
  "ADMIN",
]

/**
 * Roles allowed to READ cost_categories (mirrors 0040 RLS SELECT policy).
 * OPERATIONS is included deliberately: PICs create budgets/expenses and need
 * the category dropdown on the event detail page. SALES/SALES_MANAGER never
 * touch budgets or expenses, so they are excluded.
 */
export const COST_CATEGORY_READ_ROLES: Role[] = [
  "OPERATIONS",
  "OPERATIONS_MANAGER",
  "FINANCE",
  "MANAGEMENT",
  "ADMIN",
]

export type MasterTab = { href: string; label: string }

/** All Master Data tabs in display order. */
export const MASTER_TABS: MasterTab[] = [
  { href: "/master/customers", label: "Customer" },
  { href: "/master/trainings", label: "Training/Program" },
  { href: "/master/cities", label: "Kota" },
  { href: "/master/trainers", label: "Trainer" },
  { href: "/master/venues", label: "Venue" },
  { href: "/master/equipment", label: "Equipment" },
  { href: "/master/checklist-templates", label: "Template Checklist" },
  { href: "/master/task-templates", label: "Template Task" },
  { href: "/master/cost-categories", label: "Kategori Biaya" },
  { href: "/master/vendors", label: "Vendor" },
  { href: "/master/approval-thresholds", label: "Approval Threshold" },
]

const CUSTOMER_TAB: MasterTab = { href: "/master/customers", label: "Customer" }

/** Full master section <=> role holds at least one of MASTER_DATA_ROLES. */
export function canViewMasterData(roles: string[] | undefined | null): boolean {
  return !!roles?.some((r) => (MASTER_DATA_ROLES as string[]).includes(r))
}

/**
 * Tabs to render in the Master Data layout. Non-master roles (Sales, Sales
 * Manager, Operations) only ever see the Customer tab — they reach this layout
 * exclusively via the standalone Customer nav entry.
 */
export function visibleMasterTabs(roles: string[] | undefined | null): MasterTab[] {
  if (canViewMasterData(roles)) return MASTER_TABS
  return [CUSTOMER_TAB]
}

/**
 * Section heading for the Master Data layout. Non-master roles get no
 * "Master Data" heading at all — just the customer list and its add button.
 */
export function masterSectionHeading(roles: string[] | undefined | null): string | null {
  return canViewMasterData(roles) ? "Master Data" : null
}
