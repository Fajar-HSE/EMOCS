import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { hasAnyRole } from "@/lib/auth/roles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EventStatusBadge } from "@/components/shared/event-status-badge"
import { CopyableCode } from "@/components/shared/copyable-code"
import { PageProgress } from "@/components/shared/page-progress"
import { formatDate, formatIDR } from "@/lib/utils/format"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventActionsPanel } from "./event-actions-panel"
import { TaskPanel } from "./task-panel"
import { ChecklistPanel } from "./checklist-panel"
import { IssuePanel } from "./issue-panel"
import { ResourcesPanel } from "./resources-panel"
import { DocumentPanel } from "./document-panel"
import { ParticipantPanel } from "./participant-panel"
import { ChangeRequestPanel } from "./change-request-panel"
import { FinancialPanel } from "./financial-panel"
import { getEventCosts, getEventRevenue, getBudgetVariance, getSalesCostSummary } from "@/actions/financial-actions"
import { EVENT_STATUS_LABELS, CANCEL_CATEGORY_LABELS } from "@/lib/validations/labels"

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string; tab?: string }>
}) {
  const ctx = await requireAuth()
  const { id } = await params
  const { created, tab } = await searchParams
  const supabase = await createClient()

  const { data: event } = await supabase
    .from("events")
    .select(
      "*, customers(name), trainings(name), cities(name), pic:profiles!events_pic_user_id_fkey(id, full_name), backup_pic:profiles!events_backup_pic_user_id_fkey(full_name), sales:profiles!events_sales_user_id_fkey(full_name), sales_team:teams!events_sales_team_id_fkey(name)"
    )
    .eq("id", id)
    .maybeSingle()

  if (!event) notFound()

  const [
    { data: history },
    { data: tasks },
    { data: assignees },
    { data: taskTemplates },
    { data: checklist },
    { data: issues },
    { data: trainerAssignments },
    { data: venueBookings },
    { data: equipmentAssignments },
    { data: trainers },
    { data: venues },
    { data: equipmentList },
    { data: documents },
    { data: participants },
    { data: attendance },
    { data: changeRequests },
    { data: trainings },
    { data: budgets },
    { data: expenses },
    { data: financialClosings },
    { data: costCategories },
    { data: vendors },
  ] = await Promise.all([
      supabase
        .from("event_status_history")
        .select("from_status, to_status, changed_at, reason, changed_by:profiles(full_name)")
        .eq("event_id", id)
        .order("changed_at", { ascending: false }),
      supabase
        .from("event_tasks")
        .select("id, title, status, priority, due_date, is_mandatory, blocked_reason, assignee:profiles!event_tasks_assignee_user_id_fkey(full_name)")
        .eq("event_id", id)
        .is("deleted_at", null)
        .order("due_date"),
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("task_templates").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("event_checklists")
        .select("id, category, label, is_mandatory, is_done")
        .eq("event_id", id)
        .is("deleted_at", null)
        .order("sort_order"),
      supabase
        .from("event_issues")
        .select("id, title, category, severity, status, description, resolution, root_cause, assignee:profiles!event_issues_assignee_user_id_fkey(full_name)")
        .eq("event_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("trainer_assignments")
        .select("id, role, status, fee, trainer:trainers(full_name)")
        .eq("event_id", id)
        .is("deleted_at", null)
        .order("created_at"),
      supabase
        .from("venue_bookings")
        .select("id, status, estimated_cost, venue:venues(name)")
        .eq("event_id", id)
        .is("deleted_at", null)
        .order("created_at"),
      supabase
        .from("equipment_assignments")
        .select("id, quantity, status, equipment:equipment(name)")
        .eq("event_id", id)
        .is("deleted_at", null)
        .order("created_at"),
      supabase.from("trainers").select("id, name:full_name").is("deleted_at", null).order("full_name"),
      supabase.from("venues").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("equipment").select("id, name").is("deleted_at", null).order("name"),
      supabase
        .from("documents")
        .select(
          "id, document_type, file_name, storage_path, is_mandatory, verification_status, verification_note, uploader:profiles!documents_uploaded_by_fkey(full_name)"
        )
        .eq("event_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("participants")
        .select("id, full_name, company_name, job_title, email, phone, registration_status, unit_price, billing_status, payment_status")
        .eq("event_id", id)
        .is("deleted_at", null)
        .order("full_name"),
      supabase
        .from("participant_attendance")
        .select("participant_id, attendance_date, is_present, participants!inner(event_id)")
        .eq("participants.event_id", id),
      supabase
        .from("event_change_requests")
        .select(
          "id, field_name, old_value, new_value, reason, cost_impact_note, status, rejection_reason, requester:profiles!event_change_requests_requested_by_fkey(full_name)"
        )
        .eq("event_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("trainings").select("id, name").is("deleted_at", null).order("name"),
      supabase
        .from("event_budgets")
        .select("id, version, status, total_amount, event_budget_items(cost_category_id, planned_amount, cost_categories(name))")
        .eq("event_id", id)
        .order("version", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, description, amount, status, cost_category_id, receipt_document_id, cost_categories(name)")
        .eq("event_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("financial_closings")
        .select(
          "id, revenue_recognized, actual_cost, gross_profit, gross_margin_pct, margin_health, negative_margin_explanation, closed_at, reopened_at, reopened_reason"
        )
        .eq("event_id", id)
        .order("closed_at", { ascending: false }),
      supabase.from("cost_categories").select("id, name").eq("is_active", true).order("sort_order"),
      supabase.from("vendors").select("id, name").eq("is_active", true).order("name"),
    ])

  const isPic = event.pic?.id === ctx.userId
  const canManageTasks =
    isPic || hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"]) || (hasAnyRole(ctx.roles, ["OPERATIONS"]) && isPic)
  const canManageIssues =
    isPic || hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN", "MANAGEMENT"]) || (hasAnyRole(ctx.roles, ["OPERATIONS"]) && isPic)
  const canManageResources = hasAnyRole(ctx.roles, ["OPERATIONS", "OPERATIONS_MANAGER", "ADMIN"])
  const canVerifyDocuments = isPic || hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"]) || (hasAnyRole(ctx.roles, ["OPERATIONS"]) && isPic)
  // BR-PAR-02 (UU PDP): only the event's PIC, Ops Manager, and Admin may
  // see participant detail rows — Sales only ever sees the aggregate
  // events.participant_count they already have via the Ringkasan tab.
  const canViewParticipants = isPic || hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"])
  const canApproveChangeRequests = hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"])
  // BR-FIN-15/§23.2: financial detail (budget line items, individual
  // expenses) is deliberately narrower than general event visibility —
  // Sales/Sales Manager never see this tab at all. Their PRD-documented
  // entitlement (aggregate "actual cost total for their own event") is served
  // by the separate slimmed-down view below (getSalesCostSummary), never by
  // opening this tab.
  const isBackupPic = event.backup_pic_user_id === ctx.userId
  const canViewFinancial =
    hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "FINANCE", "MANAGEMENT", "ADMIN"]) ||
    (hasAnyRole(ctx.roles, ["OPERATIONS"]) && (isPic || isBackupPic))

  // Read-only compute_* RPCs (Stage D) — only fetched for viewers who'll
  // actually see the Keuangan tab; each also re-checks can_view_event_
  // financials() itself, so this is not the sole enforcement point.
  const [costsResult, revenueResult, varianceResult] = canViewFinancial
    ? await Promise.all([getEventCosts(event.id), getEventRevenue(event.id), getBudgetVariance(event.id)])
    : [null, null, null]

  // Slimmed-down cost summary for the owning Sales rep only (§23.2) — shown
  // in Ringkasan when they can't see the Keuangan tab. Owner-only enforced
  // inside getSalesCostSummary(); only the total leaves that function.
  // Never passed to a Client Component (same secrecy rule as sales value).
  const isSalesOwner = event.sales_user_id === ctx.userId
  const salesCostResult =
    isSalesOwner && !canViewFinancial ? await getSalesCostSummary(event.id) : null

  // D01/D03/D04: sales value visible to the owning Sales rep, any Ops role
  // (so they can judge whether spend is reasonable), and management-tier
  // roles. Other Sales reps browsing this event (D04 read-only access) do
  // not see it. Never passed to a Client Component (see Stage 9 note),
  // so an unauthorized viewer's render tree truly never contains it.
  const canSeeSalesValue =
    event.sales_user_id === ctx.userId ||
    hasAnyRole(ctx.roles, ["OPERATIONS", "OPERATIONS_MANAGER", "SALES_MANAGER", "MANAGEMENT", "FINANCE", "ADMIN"])

  const checklistCount = checklist?.length ?? 0
  const issueCount = (issues?.length ?? 0) + (changeRequests?.length ?? 0)
  const documentCount = documents?.length ?? 0

  const TAB_VALUES = ["overview", "tasks", "checklist", "resources", "financial", "issues", "documents", "audit"] as const
  const defaultTab =
    tab && TAB_VALUES.includes(tab as (typeof TAB_VALUES)[number]) && (tab !== "financial" || canViewFinancial)
      ? tab
      : "overview"

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CopyableCode value={event.event_code ?? "DRAFT"} className="text-sm" />
              {event.is_rush && <Badge variant="destructive">RUSH</Badge>}
            </div>
            <h1 className="text-xl font-semibold">{event.event_name}</h1>
            <p className="text-muted-foreground text-sm">
              {event.customers?.name ?? "—"} ·{" "}
              {event.trainings ? event.trainings.name : "—"} ·{" "}
              {formatDate(event.start_date)}
              {event.end_date ? ` s/d ${formatDate(event.end_date)}` : ""} · {event.cities?.name ?? "—"}
              {canViewParticipants ? ` · ${participants?.length ?? 0} peserta` : ""}
            </p>
          </div>
          <EventStatusBadge status={event.status} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            PIC {event.pic?.full_name ?? "—"}
            {event.backup_pic?.full_name ? ` (backup: ${event.backup_pic.full_name})` : ""} · Sales{" "}
            {event.sales?.full_name ?? "—"}
          </p>
          <PageProgress value={event.progress_percentage} className="w-full max-w-sm" />
        </div>
      </header>

      {created === "1" && event.status === "SUBMITTED" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-emerald-900">Event Request berhasil dibuat!</p>
              <p className="text-emerald-800">
                Status: {EVENT_STATUS_LABELS.SUBMITTED}
              </p>
              <p className="mt-3 text-emerald-800">
                <span className="text-xs font-medium tracking-wide text-emerald-700 uppercase">
                  Request ID
                </span>
                <span className="block font-mono text-2xl font-semibold text-emerald-900">
                  {event.event_code ?? event.id}
                </span>
              </p>
            </div>
            <Link href={`/events/${event.id}`} className="shrink-0 text-emerald-700 underline">
              Tutup
            </Link>
          </div>
          <p className="mt-3 font-medium text-emerald-900">Langkah berikutnya:</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {event.sales_user_id === ctx.userId && (
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
                render={<Link href="/events?mine=1">Lacak Status Request</Link>}
              />
            )}
            {hasAnyRole(ctx.roles, ["OPERATIONS_MANAGER", "ADMIN"]) && (
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
                render={<a href="#aksi-event">Review Request Sekarang</a>}
              />
            )}
          </div>
          <p className="mt-3 text-emerald-800">
            {event.sales_user_id === ctx.userId
              ? "Anda akan menerima notifikasi di lonceng saat request ini disetujui, diminta revisi, atau ditolak. "
              : ""}
            Pantau perkembangan di tab Audit Trail — setiap perubahan status tercatat di sana.
          </p>
        </div>
      )}

      <div id="aksi-event" className="scroll-mt-4">
        <EventActionsPanel
          eventId={event.id}
          status={event.status}
          roles={ctx.roles}
          isPic={isPic}
          startDate={event.start_date}
        />
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-fit max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Ringkasan Event</TabsTrigger>
          <TabsTrigger value="tasks">Task &amp; Progres ({event.progress_percentage ?? 0}%)</TabsTrigger>
          <TabsTrigger value="checklist">Checklist SOP ({checklistCount})</TabsTrigger>
          <TabsTrigger value="resources">Resource &amp; Peserta</TabsTrigger>
          {canViewFinancial && <TabsTrigger value="financial">Keuangan &amp; Closing</TabsTrigger>}
          <TabsTrigger value="issues">Issues &amp; CR ({issueCount})</TabsTrigger>
          <TabsTrigger value="documents">Dokumen &amp; Bukti ({documentCount})</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <dl className="grid max-w-3xl grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd>{event.customers?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Program</dt>
              <dd>{event.trainings ? event.trainings.name : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tanggal</dt>
              <dd>
                {formatDate(event.start_date)}
                {event.end_date ? ` s/d ${formatDate(event.end_date)}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kota</dt>
              <dd>{event.cities?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sales</dt>
              <dd>{event.sales?.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tim Sales</dt>
              <dd>{event.sales_team?.name ?? "—"}</dd>
            </div>
            {canSeeSalesValue && (
              <div>
                <dt className="text-muted-foreground">Nilai Jual</dt>
                <dd>{formatIDR(event.sales_value)}</dd>
              </div>
            )}
            {salesCostResult?.ok && (
              <div>
                <dt className="text-muted-foreground">Total Biaya Aktual</dt>
                <dd className="font-medium tabular-nums">{formatIDR(salesCostResult.data.actual_cost)}</dd>
                <dd className="text-muted-foreground text-xs">
                  Total biaya disetujui event ini. Rincian per pengeluaran hanya untuk tim Keuangan &amp; Operasional.
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">PIC</dt>
              <dd>
                {event.pic?.full_name ?? "—"}
                {event.backup_pic?.full_name ? ` (backup: ${event.backup_pic.full_name})` : ""}
              </dd>
            </div>
            {event.cancellation_reason && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">
                  Alasan {event.status === "POSTPONED" ? "Penundaan" : "Pembatalan"}
                </dt>
                <dd>
                  {event.cancellation_reason}{" "}
                  {event.cancellation_category
                    ? `(${CANCEL_CATEGORY_LABELS[event.cancellation_category as keyof typeof CANCEL_CATEGORY_LABELS] ?? event.cancellation_category})`
                    : ""}
                </dd>
              </div>
            )}
            {event.revision_note && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Catatan Revisi</dt>
                <dd>{event.revision_note}</dd>
              </div>
            )}
            {event.rejection_reason && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Alasan Penolakan</dt>
                <dd>{event.rejection_reason}</dd>
              </div>
            )}
          </dl>
        </TabsContent>

        <TabsContent value="tasks" className="pt-4">
          <TaskPanel
            eventId={event.id}
            tasks={tasks ?? []}
            assignees={assignees ?? []}
            taskTemplates={taskTemplates ?? []}
            canManage={!!canManageTasks}
          />
        </TabsContent>

        <TabsContent value="checklist" className="pt-4">
          <ChecklistPanel eventId={event.id} items={checklist ?? []} canManage={!!canManageTasks} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6 pt-4">
          <ResourcesPanel
            eventId={event.id}
            trainerAssignments={trainerAssignments ?? []}
            venueBookings={venueBookings ?? []}
            equipmentAssignments={equipmentAssignments ?? []}
            trainers={trainers ?? []}
            venues={venues ?? []}
            equipmentList={equipmentList ?? []}
            canManage={canManageResources}
          />
          {canViewParticipants && (
            <ParticipantPanel
              eventId={event.id}
              participants={participants ?? []}
              attendance={attendance ?? []}
              defaultDate={event.start_date ?? new Date().toISOString().slice(0, 10)}
            />
          )}
        </TabsContent>

        {canViewFinancial && (
          <TabsContent value="financial" className="pt-4">
            <FinancialPanel
              eventId={event.id}
              eventStatus={event.status}
              budgets={budgets ?? []}
              expenses={expenses ?? []}
              costCategories={costCategories ?? []}
              vendors={vendors ?? []}
              receiptDocuments={(documents ?? [])
                .filter((d) => d.document_type === "EXPENSE_RECEIPT")
                .map((d) => ({ id: d.id, file_name: d.file_name }))}
              costsSummary={costsResult?.ok ? costsResult.data : null}
              revenue={revenueResult?.ok ? revenueResult.data : null}
              variance={varianceResult?.ok ? varianceResult.data : []}
              closings={financialClosings ?? []}
              roles={ctx.roles}
            />
          </TabsContent>
        )}

        <TabsContent value="issues" className="space-y-6 pt-4">
          <IssuePanel eventId={event.id} issues={issues ?? []} assignees={assignees ?? []} canManage={!!canManageIssues} />
          <ChangeRequestPanel
            eventId={event.id}
            requests={changeRequests ?? []}
            trainings={trainings ?? []}
            canApprove={canApproveChangeRequests}
          />
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <DocumentPanel eventId={event.id} documents={documents ?? []} canVerify={canVerifyDocuments} />
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <ul className="flex flex-col gap-2 text-sm">
            {history?.length === 0 && <li className="text-muted-foreground">Belum ada aktivitas.</li>}
            {history?.map((h, i) => (
              <li key={i} className="border-l-2 pl-3">
                <span className="inline-flex items-center gap-1.5 align-middle">
                  {h.from_status ? <EventStatusBadge status={h.from_status} /> : <span className="text-muted-foreground">—</span>}
                  <span className="text-muted-foreground">→</span>
                  <EventStatusBadge status={h.to_status} />
                </span>{" "}
                <span className="text-muted-foreground">
                  oleh {h.changed_by?.full_name ?? "sistem"} · {formatDate(h.changed_at, "d MMM yyyy, HH:mm")}
                </span>
                {h.reason && <p className="text-muted-foreground">{h.reason}</p>}
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  )
}