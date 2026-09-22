"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  trainerAssignmentSchema,
  venueBookingSchema,
  equipmentAssignmentSchema,
  type TrainerAssignmentInput,
  type VenueBookingInput,
  type EquipmentAssignmentInput,
} from "@/lib/validations/assignment"
import {
  assignTrainer,
  updateTrainerAssignmentStatus,
  removeTrainerAssignment,
  bookVenue,
  updateVenueBookingStatus,
  removeVenueBooking,
  assignEquipment,
  updateEquipmentAssignmentStatus,
  removeEquipmentAssignment,
} from "@/actions/assignment-actions"
import { TRAINER_ROLE_LABELS } from "@/lib/validations/labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Option = { id: string; name: string }

type TrainerAssignment = {
  id: string
  role: string
  status: string
  fee: number | null
  trainer: { full_name: string } | null
}
type VenueBooking = {
  id: string
  status: string
  estimated_cost: number | null
  venue: { name: string } | null
}
type EquipmentAssignment = {
  id: string
  quantity: number
  status: string
  equipment: { name: string } | null
}

const TRAINER_ROLES = ["MAIN", "CO_TRAINER", "ASSESSOR", "BACKUP"]
const TRAINER_STATUSES = ["REQUESTED", "AVAILABLE", "ASSIGNED", "CONFIRMED", "CANCELLED", "REPLACED"]
const VENUE_STATUSES = ["INQUIRY", "HOLD", "BOOKED", "CONFIRMED", "CANCELLED"]
const EQUIPMENT_STATUSES = ["PLANNED", "PREPARED", "IN_USE", "RETURNED"]

function currency(v: number | null) {
  return v != null ? v.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }) : "—"
}

export function ResourcesPanel({
  eventId,
  trainerAssignments,
  venueBookings,
  equipmentAssignments,
  trainers,
  venues,
  equipmentList,
  canManage,
}: {
  eventId: string
  trainerAssignments: TrainerAssignment[]
  venueBookings: VenueBooking[]
  equipmentAssignments: EquipmentAssignment[]
  trainers: Option[]
  venues: Option[]
  equipmentList: Option[]
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-8">
      <TrainerSection
        eventId={eventId}
        assignments={trainerAssignments}
        trainers={trainers}
        canManage={canManage}
        pending={pending}
        startTransition={startTransition}
      />
      <VenueSection
        eventId={eventId}
        bookings={venueBookings}
        venues={venues}
        canManage={canManage}
        pending={pending}
        startTransition={startTransition}
      />
      <EquipmentSection
        eventId={eventId}
        assignments={equipmentAssignments}
        equipmentList={equipmentList}
        canManage={canManage}
        pending={pending}
        startTransition={startTransition}
      />
    </div>
  )
}

function TrainerSection({
  eventId,
  assignments,
  trainers,
  canManage,
  pending,
  startTransition,
}: {
  eventId: string
  assignments: TrainerAssignment[]
  trainers: Option[]
  canManage: boolean
  pending: boolean
  startTransition: (fn: () => void | Promise<void>) => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<TrainerAssignmentInput>({
    resolver: zodResolver(trainerAssignmentSchema),
    defaultValues: { role: "MAIN", notes: "" },
  })

  async function onSubmit(values: TrainerAssignmentInput) {
    const result = await assignTrainer(eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menugaskan trainer")
      return
    }
    if (result.warning) toast.warning(result.warning)
    else toast.success("Trainer ditugaskan")
    form.reset({ role: "MAIN", notes: "" })
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Trainer</h3>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm">+ Trainer</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tugaskan Trainer</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="trainer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trainer</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          items={trainers.map((t) => ({ value: t.id, label: t.name }))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih trainer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {trainers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peran</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          items={TRAINER_ROLES.map((v) => ({
                            value: v,
                            label: TRAINER_ROLE_LABELS[v as keyof typeof TRAINER_ROLE_LABELS] ?? v,
                          }))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TRAINER_ROLES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {TRAINER_ROLE_LABELS[v as keyof typeof TRAINER_ROLE_LABELS] ?? v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fee (IDR, opsional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      Tugaskan
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {assignments.length === 0 && <p className="text-muted-foreground text-sm">Belum ada trainer ditugaskan.</p>}
      {assignments.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trainer</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.trainer?.full_name ?? "—"}</TableCell>
                <TableCell>{a.role}</TableCell>
                <TableCell>{currency(a.fee)}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Select
                      value={a.status}
                      disabled={pending}
                      onValueChange={(v) =>
                        v &&
                        startTransition(async () => {
                          const r = await updateTrainerAssignmentStatus(a.id, eventId, v as never)
                          if (!r.ok) toast.error(r.message ?? "Gagal")
                        })
                      }
                    >
                      <SelectTrigger size="sm">
                        <SelectValue>{a.status}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{a.status}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await removeTrainerAssignment(a.id, eventId)
                          if (!r.ok) toast.error(r.message ?? "Gagal")
                        })
                      }
                    >
                      Hapus
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function VenueSection({
  eventId,
  bookings,
  venues,
  canManage,
  pending,
  startTransition,
}: {
  eventId: string
  bookings: VenueBooking[]
  venues: Option[]
  canManage: boolean
  pending: boolean
  startTransition: (fn: () => void | Promise<void>) => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<VenueBookingInput>({
    resolver: zodResolver(venueBookingSchema),
    defaultValues: { confirmation_number: "", notes: "" },
  })

  async function onSubmit(values: VenueBookingInput) {
    const result = await bookVenue(eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal booking venue")
      return
    }
    if (result.warning) toast.warning(result.warning)
    else toast.success("Venue di-booking")
    form.reset({ confirmation_number: "", notes: "" })
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Venue</h3>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm">+ Venue</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Booking Venue</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="venue_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          items={venues.map((v) => ({ value: v.id, label: v.name }))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih venue" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {venues.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimated_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimasi Biaya (IDR, opsional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      Booking
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {bookings.length === 0 && <p className="text-muted-foreground text-sm">Belum ada venue dibooking.</p>}
      {bookings.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Venue</TableHead>
              <TableHead>Estimasi Biaya</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.venue?.name ?? "—"}</TableCell>
                <TableCell>{currency(b.estimated_cost)}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Select
                      value={b.status}
                      disabled={pending}
                      onValueChange={(v) =>
                        v &&
                        startTransition(async () => {
                          const r = await updateVenueBookingStatus(b.id, eventId, v as never)
                          if (!r.ok) toast.error(r.message ?? "Gagal")
                        })
                      }
                    >
                      <SelectTrigger size="sm">
                        <SelectValue>{b.status}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {VENUE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{b.status}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await removeVenueBooking(b.id, eventId)
                          if (!r.ok) toast.error(r.message ?? "Gagal")
                        })
                      }
                    >
                      Hapus
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function EquipmentSection({
  eventId,
  assignments,
  equipmentList,
  canManage,
  pending,
  startTransition,
}: {
  eventId: string
  assignments: EquipmentAssignment[]
  equipmentList: Option[]
  canManage: boolean
  pending: boolean
  startTransition: (fn: () => void | Promise<void>) => void
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<EquipmentAssignmentInput>({
    resolver: zodResolver(equipmentAssignmentSchema),
    defaultValues: { quantity: 1 },
  })

  async function onSubmit(values: EquipmentAssignmentInput) {
    const result = await assignEquipment(eventId, values)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menugaskan equipment")
      return
    }
    if (result.warning) toast.warning(result.warning)
    else toast.success("Equipment ditugaskan")
    form.reset({ quantity: 1 })
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Equipment</h3>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm">+ Equipment</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tugaskan Equipment</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="equipment_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          items={equipmentList.map((e) => ({ value: e.id, label: e.name }))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih equipment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipmentList.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value === "" ? 1 : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      Tugaskan
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {assignments.length === 0 && <p className="text-muted-foreground text-sm">Belum ada equipment ditugaskan.</p>}
      {assignments.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.equipment?.name ?? "—"}</TableCell>
                <TableCell>{a.quantity}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Select
                      value={a.status}
                      disabled={pending}
                      onValueChange={(v) =>
                        v &&
                        startTransition(async () => {
                          const r = await updateEquipmentAssignmentStatus(a.id, eventId, v as never)
                          if (!r.ok) toast.error(r.message ?? "Gagal")
                        })
                      }
                    >
                      <SelectTrigger size="sm">
                        <SelectValue>{a.status}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{a.status}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await removeEquipmentAssignment(a.id, eventId)
                          if (!r.ok) toast.error(r.message ?? "Gagal")
                        })
                      }
                    >
                      Hapus
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
