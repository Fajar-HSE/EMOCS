"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  reviewEvent,
  cancelEvent,
  postponeEvent,
  startPreparation,
  markReady,
  markRunning,
  markCompleted,
  markPostEvent,
  startFinancialClosing,
  reopenClosedEvent,
  assignPic,
  getPicCandidates,
  type PicCandidate,
} from "@/actions/event-actions"
import type { Role } from "@/lib/auth/roles"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CANCEL_CATEGORIES = ["CUSTOMER_CANCELLED", "INTERNAL_CANCELLED", "FORCE_MAJEURE", "DUPLICATE", "OTHER"]

export function EventActionsPanel({
  eventId,
  status,
  roles,
  isPic,
  startDate,
}: {
  eventId: string
  status: string
  roles: Role[]
  isPic: boolean
  startDate: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [reviewDialog, setReviewDialog] = useState<"REJECT" | "REVISION" | null>(null)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [postponeDialog, setPostponeDialog] = useState(false)
  const [reopenDialog, setReopenDialog] = useState(false)
  const [assignDialog, setAssignDialog] = useState(false)
  const [note, setNote] = useState("")
  const [cancelCategory, setCancelCategory] = useState("")
  const [candidates, setCandidates] = useState<PicCandidate[]>([])
  const [picUserId, setPicUserId] = useState<string | undefined>()
  const [backupPicUserId, setBackupPicUserId] = useState<string | undefined>()

  const isOpsManager = roles.includes("OPERATIONS_MANAGER")
  const isAdmin = roles.includes("ADMIN")
  const isOps = roles.includes("OPERATIONS")
  const isSalesManager = roles.includes("SALES_MANAGER")
  const isFinance = roles.includes("FINANCE")
  const isManagement = roles.includes("MANAGEMENT")

  useEffect(() => {
    if (assignDialog) {
      getPicCandidates().then(setCandidates)
    }
  }, [assignDialog])

  function run(action: () => Promise<{ ok: boolean; message?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message ?? "Aksi gagal")
        return
      }
      toast.success(successMsg)
      router.refresh()
    })
  }

  const canReview = (isOpsManager || isAdmin) && status === "SUBMITTED"
  const canAssignPic = (isOpsManager || isAdmin) && status === "APPROVED"
  const canStartPrep = (isOps || isOpsManager || isAdmin) && status === "PIC_ASSIGNED" && (isPic || isOpsManager || isAdmin)
  const canMarkReady = (isOps || isOpsManager || isAdmin) && status === "PREPARATION"
  const canMarkRunning =
    (isOps || isOpsManager || isAdmin) &&
    status === "READY" &&
    (!startDate || new Date(startDate) <= new Date())
  const canMarkCompleted = (isOps || isOpsManager || isAdmin) && status === "RUNNING"
  const canMarkPostEvent = (isOps || isOpsManager || isAdmin) && status === "COMPLETED"
  // §14.8/transition_event_status(): only FINANCE (or ADMIN's universal
  // bypass) may start Financial Closing — the actual closing computation
  // (prerequisite checks, revenue/margin snapshot) lives in the Financial
  // tab's apply_financial_closing() wrapper, not here.
  const canStartFinancialClosing = (isFinance || isAdmin) && status === "POST_EVENT"
  // BR-FIN-10: reopening a CLOSED event is FINANCE/MANAGEMENT/ADMIN only and
  // always requires a written reason, enforced again at the DB layer.
  const canReopen = (isFinance || isManagement || isAdmin) && status === "CLOSED"
  const canCancelPostpone =
    (isOpsManager || isSalesManager || isAdmin) &&
    !["CLOSED", "CANCELLED", "POSTPONED", "DRAFT"].includes(status)

  return (
    <div className="flex flex-wrap gap-2">
      {canReview && (
        <>
          <Button size="sm" disabled={pending} onClick={() => run(() => reviewEvent(eventId, "APPROVE"), "Event disetujui")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setReviewDialog("REVISION")}>
            Minta Revisi
          </Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => setReviewDialog("REJECT")}>
            Reject
          </Button>
        </>
      )}

      {canAssignPic && (
        <Button size="sm" disabled={pending} onClick={() => setAssignDialog(true)}>
          Assign PIC
        </Button>
      )}

      {canStartPrep && (
        <Button size="sm" disabled={pending} onClick={() => run(() => startPreparation(eventId), "Persiapan dimulai")}>
          Mulai Persiapan
        </Button>
      )}
      {canMarkReady && (
        <Button size="sm" disabled={pending} onClick={() => run(() => markReady(eventId), "Event ditandai siap")}>
          Tandai Siap
        </Button>
      )}
      {canMarkRunning && (
        <Button size="sm" disabled={pending} onClick={() => run(() => markRunning(eventId), "Event sedang berlangsung")}>
          Mulai Event (Running)
        </Button>
      )}
      {canMarkCompleted && (
        <Button size="sm" disabled={pending} onClick={() => run(() => markCompleted(eventId), "Event selesai")}>
          Tandai Selesai
        </Button>
      )}
      {canMarkPostEvent && (
        <Button size="sm" disabled={pending} onClick={() => run(() => markPostEvent(eventId), "Masuk tahap pasca-event")}>
          Lanjut Pasca-Event
        </Button>
      )}

      {canStartFinancialClosing && (
        <Button size="sm" disabled={pending} onClick={() => run(() => startFinancialClosing(eventId), "Masuk tahap Financial Closing")}>
          Mulai Financial Closing
        </Button>
      )}
      {canReopen && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setReopenDialog(true)}>
          Buka Kembali Event
        </Button>
      )}

      {canCancelPostpone && (
        <>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setPostponeDialog(true)}>
            Tunda
          </Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => setCancelDialog(true)}>
            Batalkan
          </Button>
        </>
      )}

      {/* Approve/Reject/Revision reason dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(o) => !o && setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewDialog === "REJECT" ? "Tolak Event" : "Minta Revisi"}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={reviewDialog === "REJECT" ? "Alasan penolakan..." : "Catatan revisi..."}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => {
                const decision = reviewDialog!
                run(() => reviewEvent(eventId, decision, note), decision === "REJECT" ? "Event ditolak" : "Revisi diminta")
                setReviewDialog(null)
                setNote("")
              }}
            >
              Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Event</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5">Kategori</Label>
              <Select value={cancelCategory} onValueChange={(v) => setCancelCategory(v ?? "")} items={CANCEL_CATEGORIES.map((c) => ({ value: c, label: c }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Alasan pembatalan..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                run(() => cancelEvent(eventId, note, cancelCategory), "Event dibatalkan")
                setCancelDialog(false)
                setNote("")
                setCancelCategory("")
              }}
            >
              Batalkan Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Postpone dialog */}
      <Dialog open={postponeDialog} onOpenChange={setPostponeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tunda Event</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Alasan penundaan..." value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => {
                run(() => postponeEvent(eventId, note), "Event ditunda")
                setPostponeDialog(false)
                setNote("")
              }}
            >
              Tunda Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen dialog */}
      <Dialog open={reopenDialog} onOpenChange={setReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka Kembali Event</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Alasan membuka kembali event..." value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => {
                run(() => reopenClosedEvent(eventId, note), "Event dibuka kembali, kembali ke Financial Closing")
                setReopenDialog(false)
                setNote("")
              }}
            >
              Buka Kembali
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign PIC dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign PIC</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5">PIC Utama</Label>
              <Select
                value={picUserId ?? ""}
                onValueChange={(v) => setPicUserId(v ?? undefined)}
                items={candidates.map((c) => ({
                  value: c.id,
                  label: `${c.full_name} (${c.active_event_count} event aktif, ${c.overdue_task_count} task telat)`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih PIC" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.active_event_count} event aktif, {c.overdue_task_count} task telat)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Backup PIC (opsional)</Label>
              <Select
                value={backupPicUserId ?? ""}
                onValueChange={(v) => setBackupPicUserId(v ?? undefined)}
                items={candidates.filter((c) => c.id !== picUserId).map((c) => ({ value: c.id, label: c.full_name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih backup PIC" />
                </SelectTrigger>
                <SelectContent>
                  {candidates
                    .filter((c) => c.id !== picUserId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Catatan tanggung jawab (opsional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !picUserId}
              onClick={() => {
                run(() => assignPic(eventId, picUserId!, backupPicUserId, note), "PIC berhasil ditugaskan")
                setAssignDialog(false)
                setNote("")
                setPicUserId(undefined)
                setBackupPicUserId(undefined)
              }}
            >
              Simpan Penugasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
