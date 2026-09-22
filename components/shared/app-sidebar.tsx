"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Database,
  House,
  Inbox,
  ScrollText,
  ShieldCheck,
  Wallet,
  Calculator,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CUSTOMER_NAV_ROLES, MASTER_DATA_ROLES } from "@/lib/auth/navigation"

export const ROLE_LABELS: Record<string, string> = {
  SALES: "Sales",
  SALES_MANAGER: "Sales Manager",
  OPERATIONS: "Operations",
  OPERATIONS_MANAGER: "Ops Manager",
  MANAGEMENT: "Management",
  FINANCE: "Finance",
  ADMIN: "Admin",
}

const COMING_SOON = "Segera hadir"

type NavItem = {
  label: string
  href?: string
  icon: LucideIcon
  roles?: string[]
  soon?: boolean
  soonPermanent?: boolean
  /** Warna pill badge count di sidebar gelap (mengikuti prototipe). */
  badge: string
}

// Struktur 9 menu mengikuti prototipe (emocs-icc.ai.studio).
// Cost Estimator = Phase 4 (data historis belum cukup), nonaktif permanen.
const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: House, badge: "" },
  {
    label: "Request Inbox",
    href: "/inbox",
    icon: Inbox,
    roles: ["OPERATIONS_MANAGER", "OPERATIONS", "ADMIN"],
    badge: "bg-rose-500/15 text-rose-300",
  },
  { label: "Daftar Event", href: "/events", icon: CalendarDays, badge: "" },
  // Customer untuk tim Sales (create) — manajer tetap lewat Master Data.
  // Role list terpusat di lib/auth/navigation.ts (CUSTOMER_NAV_ROLES).
  {
    label: "Customer",
    href: "/master/customers",
    icon: Users,
    roles: CUSTOMER_NAV_ROLES,
    badge: "",
  },
  {
    label: "Task & Checklist",
    href: "/tasks",
    icon: ClipboardList,
    roles: ["OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"],
    badge: "bg-indigo-500/15 text-indigo-300",
  },
  {
    label: "Finance & Closing",
    href: "/financials",
    icon: Wallet,
    roles: ["FINANCE", "MANAGEMENT", "ADMIN", "OPERATIONS_MANAGER"],
    badge: "bg-amber-500/15 text-amber-300",
  },
  {
    label: "Cost Estimator",
    icon: Calculator,
    soon: true,
    soonPermanent: true,
    badge: "",
  },
  {
    label: "Database Historis & BI",
    href: "/analytics",
    icon: BarChart3,
    roles: ["SALES_MANAGER", "OPERATIONS_MANAGER", "FINANCE", "MANAGEMENT", "ADMIN"],
    badge: "",
  },
  {
    label: "Master Data",
    href: "/master",
    icon: Database,
    // Role list terpusat di lib/auth/navigation.ts (MASTER_DATA_ROLES).
    roles: MASTER_DATA_ROLES,
    badge: "",
  },
  {
    label: "Audit Log & Security",
    href: "/audit-log",
    icon: ScrollText,
    // RLS audit_logs: ADMIN/MANAGEMENT semua tabel; OPS_MGR hanya events/event_tasks.
    roles: ["ADMIN", "MANAGEMENT", "OPERATIONS_MANAGER"],
    badge: "",
  },
  // Fungsi admin (manajemen user & role) tidak ada di prototipe — tetap
  // ditampilkan untuk ADMIN agar fungsi sebenarnya tidak hilang.
  { label: "Admin", href: "/admin", icon: ShieldCheck, roles: ["ADMIN"], badge: "" },
]

export type SidebarCounts = { inbox?: number; tasks?: number; financials?: number }

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({ roles, counts }: { roles: string[]; counts?: SidebarCounts }) {
  const pathname = usePathname()

  const itemCls = (active: boolean) =>
    cn(
      "flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition",
      active
        ? "bg-indigo-600 text-white shadow-sm"
        : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
    )
  const iconCls = (active: boolean) => cn("h-5 w-5 shrink-0", active ? "" : "text-slate-400")

  const visible = NAV.filter(
    (item) => !item.roles || item.roles.some((r) => roles.includes(r)),
  )

  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col justify-between overflow-hidden bg-slate-900 text-slate-300 lg:flex">
      {/* Area logo + menu di-scroll mandiri: di layar pendek, menu bawah
          (Audit Log, Admin) tetap terjangkau, bukan terpotong. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-slate-700/40 px-6 py-5">
          <div className="rounded-xl bg-white p-2">
            <Image
              src="/logo-studio-p26.png"
              alt="Studio P26"
              width={2160}
              height={1214}
              className="h-auto w-full"
              priority
            />
          </div>
          <p className="mt-2 text-center text-[10px] tracking-widest text-slate-400">EMOCS</p>
        </div>

        <nav className="space-y-1.5 px-3 py-5 text-sm font-medium">
          {visible.map((item) => {
            const Icon = item.icon
            if (!item.href) {
              return (
                <span
                  key={item.label}
                  title={COMING_SOON}
                  className="flex cursor-not-allowed items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500"
                >
                  <Icon className="h-5 w-5 text-slate-600" />
                  <span>{item.label}</span>
                  <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    {COMING_SOON}
                  </span>
                </span>
              )
            }
            const active = isActive(pathname, item.href)
            const count = item.href ? counts?.[item.href.slice(1) as keyof SidebarCounts] ?? 0 : 0
            return (
              <Link key={item.label} href={item.href} className={itemCls(active)}>
                <Icon className={iconCls(active)} />
                <span className="tracking-wide">{item.label}</span>
                {count > 0 ? (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      item.badge,
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="relative overflow-hidden p-6 pt-10">
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 opacity-80">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            <path d="M 0,30 Q 30,30 50,70 Q 60,90 70,100 L 0,100 Z" fill="#d946ef" opacity="0.8" />
            <path d="M 0,60 Q 30,60 50,85 L 0,100 Z" fill="#06b6d4" opacity="0.9" />
            <path d="M 0,75 Q 20,75 35,95 L 0,100 Z" fill="#f59e0b" opacity="0.9" />
          </svg>
        </div>
        <p className="relative z-10 pr-6 text-right text-xs leading-tight font-medium tracking-wide text-slate-400 italic">
          Better Events
          <br />
          <span className="font-semibold text-slate-300">Greater Impact</span>
        </p>
      </div>
    </aside>
  )
}