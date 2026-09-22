import Link from "next/link"
import {
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Check,
  FileText,
  Pencil,
  Plus,
  Settings,
  Users,
} from "lucide-react"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/server"
import { EVENT_STATUS_LABELS } from "@/lib/validations/labels"
import { EventCalendar } from "@/components/dashboard/event-calendar"
import { SixMonthChart } from "@/components/dashboard/six-month-chart"
import { StatusDonut } from "@/components/dashboard/status-donut"
import {
  ACTIVE_STATUSES,
  CANCELLED_GROUP,
  DONE_STATUSES,
  STATUS_GROUPS,
  groupMeta,
  groupOf,
} from "@/components/dashboard/status-groups"

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function fmtDateRange(start: string | null, end: string | null): string {
  if (!start) return "—"
  const [sy, sm, sd] = start.split("-").map(Number)
  if (!end || end === start) return `${sd} ${SHORT_MONTHS[sm - 1]} ${sy}`
  const [ey, em, ed] = end.split("-").map(Number)
  if (sy === ey && sm === em) return `${sd}–${ed} ${SHORT_MONTHS[sm - 1]} ${sy}`
  return `${sd} ${SHORT_MONTHS[sm - 1]} – ${ed} ${SHORT_MONTHS[em - 1]} ${ey}`
}

function formatRp(n: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cal?: string }>
}) {
  const ctx = await requireAuth()
  const supabase = await createClient()

  const canSeeAll = hasAnyRole(ctx.roles, ["ADMIN", "MANAGEMENT", "OPERATIONS_MANAGER", "FINANCE"])
  const isSales = hasAnyRole(ctx.roles, ["SALES", "SALES_MANAGER"])
  const isOps = hasAnyRole(ctx.roles, ["OPERATIONS"])
  if (!canSeeAll && !isSales && !isOps) {
    return (
      <main className="p-8">
        <p className="text-sm text-slate-500">Belum ada dashboard untuk role Anda saat ini.</p>
      </main>
    )
  }

  // Query agregat: pipeline yang sudah diajukan (exclude DRAFT).
  let aggQuery = supabase
    .from("events")
    .select("id, event_code, event_name, status, sales_value, start_date, end_date, customer_id, pic_user_id")
    .is("deleted_at", null)
    .neq("status", "DRAFT")
  if (!canSeeAll && isSales) aggQuery = aggQuery.eq("sales_user_id", ctx.userId)
  if (!canSeeAll && !isSales && isOps)
    aggQuery = aggQuery.or(`pic_user_id.eq.${ctx.userId},backup_pic_user_id.eq.${ctx.userId}`)
  const { data: aggRows } = await aggQuery.order("created_at", { ascending: false })

  const rows = aggRows ?? []
  const total = rows.length
  const active = rows.filter((r) => (ACTIVE_STATUSES as string[]).includes(r.status)).length
  const done = rows.filter((r) => (DONE_STATUSES as string[]).includes(r.status)).length
  const revenue = rows
    .filter((r) => r.status !== "CANCELLED")
    .reduce((sum, r) => sum + Number(r.sales_value ?? 0), 0)

  const donut = [
    ...Object.entries(STATUS_GROUPS).map(([key, g]) => ({
      key,
      label: g.label,
      color: g.color,
      value: rows.filter((r) => (g.statuses as readonly string[]).includes(r.status)).length,
    })),
    {
      key: "CANCELLED",
      label: CANCELLED_GROUP.label,
      color: CANCELLED_GROUP.color,
      value: rows.filter((r) => r.status === "CANCELLED").length,
    },
  ].filter((s) => s.value > 0 || s.key !== "CANCELLED")

  // Seri 6 bulan kalender terakhir.
  const now = new Date()
  const buckets: { key: string; label: string; event: number; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    buckets.push({ key, label: SHORT_MONTHS[d.getUTCMonth()], event: 0, revenue: 0 })
  }
  for (const r of rows) {
    if (!r.start_date) continue
    const b = buckets.find((x) => x.key === r.start_date!.slice(0, 7))
    if (!b) continue
    b.event += 1
    if (r.status !== "CANCELLED") b.revenue += Number(r.sales_value ?? 0)
  }
  const series = buckets.map((b) => ({ month: b.label, event: b.event, revenueJt: Math.round(b.revenue / 1_000_000) }))

  // Event terbaru: ambil 5 teratas dari rows (yang sudah diorder)
  const latest = rows.slice(0, 5)

  const customerIds = [...new Set(latest.map((e) => e.customer_id).filter(Boolean))] as string[]
  const picIds = [...new Set(latest.map((e) => e.pic_user_id).filter(Boolean))] as string[]
  const [{ data: customers }, { data: pics }] = await Promise.all([
    customerIds.length > 0
      ? supabase.from("customers").select("id, name").in("id", customerIds)
      : Promise.resolve({ data: [] }),
    picIds.length > 0
      ? supabase.from("profiles").select("id, full_name, job_title").in("id", picIds)
      : Promise.resolve({ data: [] }),
  ])
  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]))
  const picMap = new Map((pics ?? []).map((p) => [p.id, p]))

  // Kalender (?cal=YYYY-MM, default bulan berjalan).
  const { cal } = await searchParams
  const calMatch = /^(\d{4})-(\d{2})$/.exec(cal ?? "")
  const calYear = calMatch ? Number(calMatch[1]) : now.getFullYear()
  const calMonth = calMatch ? Number(calMatch[2]) : now.getMonth() + 1

  const firstName = (ctx.profile?.full_name ?? ctx.email ?? "").split(" ")[0]

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 p-8">
      {/* Hero */}
      <section className="flex flex-col items-stretch justify-between gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-[26px]">
            Selamat Datang, {firstName} 👋
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
            Kelola seluruh event dengan lebih mudah, cepat, dan terstruktur dalam satu sistem.
          </p>
        </div>
        <div className="relative flex h-[106px] w-full items-center overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-r from-[#152033] via-[#1e3a5f] to-[#2563eb] shadow-sm lg:w-[460px]">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-fuchsia-500/30 blur-2xl" />
          <div className="absolute -bottom-12 right-32 h-40 w-40 rounded-full bg-cyan-400/30 blur-2xl" />
          <div className="relative z-10 pl-6">
            <p className="text-sm font-bold tracking-wide text-white">STUDIO P26</p>
            <p className="mt-0.5 text-[11px] text-slate-300">Better Events, Greater Impact</p>
          </div>
        </div>
      </section>

      {/* KPI */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={canSeeAll ? "Total Event" : "Total Event Saya"}
          value={String(total)}
          href="/events?status=ALL"
          icon={<CalendarDays className="h-5 w-5" />}
          iconBg="bg-purple-50 text-purple-600"
        />
        <KpiCard
          label="Event Aktif"
          value={String(active)}
          href="/events?status=ALL"
          icon={<CalendarCheck className="h-5 w-5" />}
          iconBg="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Event Selesai"
          value={String(done)}
          href="/events?status=COMPLETED"
          icon={<Check className="h-5 w-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <div className="flex items-start justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <div className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-slate-500">Total Revenue</span>
            <span className="block truncate text-[19px] font-bold tracking-tight text-slate-800" title={formatRp(revenue)}>
              {formatRp(revenue)}
            </span>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-base font-bold text-amber-500">
            <Banknote className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* Grafik + aksi cepat */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Status Event</h3>
          {total > 0 ? (
            <StatusDonut data={donut} total={total} />
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">Belum ada event.</p>
          )}
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Event 6 Bulan Terakhir</h3>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-[#2563eb]" /> Jumlah Event
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-[#ec4899]" /> Revenue (Juta)
              </span>
            </div>
          </div>
          <SixMonthChart data={series} />
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Quick Actions</h3>
          <div className="space-y-2.5">
            <QuickAction href="/events/new" icon={<Plus className="h-5 w-5" />} iconBg="bg-blue-600" title="Buat Event Request" desc="Ajukan event baru" />
            <QuickAction icon={<CalendarDays className="h-5 w-5" />} iconBg="bg-blue-600" title="Lihat Kalender" desc="Jadwal event & aktivitas" soon />
            <QuickAction icon={<BarChart3 className="h-5 w-5" />} iconBg="bg-slate-700" title="Lihat Laporan" desc="Data & insight event" soon />
            <QuickAction href="/master/customers" icon={<Users className="h-5 w-5" />} iconBg="bg-slate-600" title="Kelola Customer" desc="Daftar customer" />
          </div>
        </div>
      </section>

      {/* Tabel + kalender */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm lg:col-span-9">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Event Terbaru</h3>
              <Link href="/events?status=ALL" className="text-xs font-medium text-blue-600 transition hover:text-blue-700">
                Lihat Semua
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200/70 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    <th className="py-2.5 pr-2 pl-2 font-medium">No.</th>
                    <th className="py-2.5 font-medium">Nama Event</th>
                    <th className="py-2.5 font-medium">Customer</th>
                    <th className="py-2.5 font-medium">Tanggal</th>
                    <th className="py-2.5 font-medium">Status</th>
                    <th className="py-2.5 font-medium">PIC</th>
                    <th className="py-2.5 pr-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(latest ?? []).map((e, i) => {
                    const meta = groupMeta(groupOf(e.status))
                    const pic = e.pic_user_id ? picMap.get(e.pic_user_id) : undefined
                    return (
                      <tr key={e.id} className="transition hover:bg-slate-50/70">
                        <td className="py-3 pr-2 pl-2 font-medium text-slate-400">{i + 1}</td>
                        <td className="py-3 font-semibold text-slate-800">
                          {e.event_name}
                          {e.event_code ? <span className="block text-[10px] font-normal text-slate-400 tabular-nums">{e.event_code}</span> : null}
                        </td>
                        <td className="py-3">{e.customer_id ? (customerName.get(e.customer_id) ?? "—") : "—"}</td>
                        <td className="whitespace-nowrap text-slate-500">{fmtDateRange(e.start_date, e.end_date)}</td>
                        <td className="py-3">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                            style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                          >
                            {EVENT_STATUS_LABELS[e.status as keyof typeof EVENT_STATUS_LABELS] ?? e.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {pic ? (
                            <span className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-500 text-[10px] font-medium text-white">
                                {pic.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                              </span>
                              <span className="leading-none">
                                <span className="block text-[11px] font-medium text-slate-800">{pic.full_name}</span>
                                {pic.job_title ? <span className="mt-0.5 block text-[9px] text-slate-400">{pic.job_title}</span> : null}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <Link href={`/events/${e.id}`} aria-label={`Buka ${e.event_name}`} className="font-bold tracking-widest text-slate-400 hover:text-slate-600">
                            ...
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                  {(latest ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        Belum ada event.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="max-w-xs">
                <h4 className="text-xs font-bold text-slate-800">Workflow Event</h4>
                <p className="text-[10px] leading-tight text-slate-400">
                  Dari request hingga selesai, setiap tahap terpantau dengan jelas.
                </p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto py-1 sm:gap-3">
                <WorkflowStep icon={<Pencil className="h-3.5 w-3.5" />} bg="bg-blue-600" title="1. Event Request" desc="Sales" />
                <StepArrow />
                <WorkflowStep icon={<FileText className="h-3.5 w-3.5" />} bg="bg-amber-500" title="2. Review & Approval" desc="Management" />
                <StepArrow />
                <WorkflowStep icon={<Settings className="h-3.5 w-3.5" />} bg="bg-emerald-500" title="3. Operational" desc="Operations" />
                <StepArrow />
                <WorkflowStep icon={<Users className="h-3.5 w-3.5" />} bg="bg-purple-600" title="4. Pelaksanaan" desc="Team Event" />
                <StepArrow />
                <WorkflowStep icon={<Check className="h-3.5 w-3.5" />} bg="bg-slate-600" title="5. Selesai" desc="Report & Finance" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Kalender Event</h3>
          <EventCalendar
            year={calYear}
            month={Math.min(12, Math.max(1, calMonth))}
            events={rows
              .filter((r) => r.start_date)
              .map((r) => ({ id: `${r.status}-${r.start_date}`, start_date: r.start_date, end_date: r.end_date, status: r.status }))}
          />
        </div>
      </section>
    </main>
  )
}

function KpiCard({
  label,
  value,
  href,
  icon,
  iconBg,
}: {
  label: string
  value: string
  href: string
  icon: React.ReactNode
  iconBg: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:border-blue-200"
    >
      <div>
        <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
        <span className="text-2xl font-bold text-slate-800">{value}</span>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
    </Link>
  )
}

function QuickAction({
  href,
  icon,
  iconBg,
  title,
  desc,
  soon,
}: {
  href?: string
  icon: React.ReactNode
  iconBg: string
  title: string
  desc: string
  soon?: boolean
}) {
  const inner = (
    <>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${iconBg}`}>
        {icon}
      </div>
      <div className="leading-tight">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          {title}
          {soon ? (
            <span className="rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-semibold text-slate-500">
              Segera hadir
            </span>
          ) : null}
        </p>
        <p className="text-[11px] text-slate-400">{desc}</p>
      </div>
    </>
  )
  const cls =
    "flex w-full items-center gap-3.5 rounded-xl border border-slate-100 p-2.5 text-left transition " +
    (soon ? "cursor-not-allowed opacity-70" : "group hover:border-blue-200 hover:bg-blue-50/40")
  return soon ? (
    <span className={cls} title="Segera hadir">
      {inner}
    </span>
  ) : (
    <Link href={href!} className={cls}>
      {inner}
    </Link>
  )
}

function WorkflowStep({ icon, bg, title, desc }: { icon: React.ReactNode; bg: string; title: string; desc: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] text-white ${bg}`}>{icon}</div>
      <div className="leading-none">
        <p className="text-[10px] font-semibold text-slate-800">{title}</p>
        <p className="text-[8px] text-slate-400">{desc}</p>
      </div>
    </div>
  )
}

function StepArrow() {
  return <span className="text-xs text-slate-300">→</span>
}
