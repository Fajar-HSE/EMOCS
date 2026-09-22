"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { taskSchema } from "@/lib/validations/task"
import { dispatchPendingNotificationEmails } from "@/lib/services/notification-dispatch"

export type TaskActionResult = { ok: boolean; message?: string }

export async function createTask(eventId: string, input: unknown): Promise<TaskActionResult> {
  await requireAuth()
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from("event_tasks").insert({
    event_id: eventId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    assignee_user_id: parsed.data.assignee_user_id,
    due_date: parsed.data.due_date,
    priority: parsed.data.priority,
    is_mandatory: parsed.data.is_mandatory,
  })

  if (error) return { ok: false, message: error.message }
  await dispatchPendingNotificationEmails()
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function updateTaskStatus(
  taskId: string,
  eventId: string,
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED",
  blockedReason?: string
): Promise<TaskActionResult> {
  await requireAuth()
  if (status === "BLOCKED" && !blockedReason?.trim()) {
    return { ok: false, message: "Alasan blocked wajib diisi" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("event_tasks")
    .update({
      status,
      blocked_reason: status === "BLOCKED" ? blockedReason : null,
    })
    .eq("id", taskId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function deleteTask(taskId: string, eventId: string): Promise<TaskActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase
    .from("event_tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

// FR-TSK-04: bulk-create tasks from a task_template onto an event. Each
// item's due_date is computed from the template's days_before_event offset
// against the event's start_date; assignee defaults to the event's PIC
// since templates are generic and don't know who's running a given event.
export async function applyTaskTemplate(eventId: string, templateId: string): Promise<TaskActionResult> {
  const ctx = await requireAuth()
  const supabase = await createClient()

  const { data: event } = await supabase
    .from("events")
    .select("start_date, pic_user_id")
    .eq("id", eventId)
    .single()

  if (!event?.start_date) return { ok: false, message: "Tanggal mulai event belum diisi" }
  if (!event.pic_user_id) return { ok: false, message: "PIC belum ditugaskan — assign PIC dulu sebelum menerapkan template task" }

  const { data: items, error: itemsError } = await supabase
    .from("task_template_items")
    .select("title, description, days_before_event, priority, is_mandatory")
    .eq("template_id", templateId)
    .order("sort_order")

  if (itemsError) return { ok: false, message: itemsError.message }
  if (!items?.length) return { ok: false, message: "Template ini belum punya item task" }

  const { error } = await supabase.from("event_tasks").insert(
    items.map((item) => ({
      event_id: eventId,
      title: item.title,
      description: item.description,
      assignee_user_id: event.pic_user_id!,
      due_date: subtractDays(event.start_date!, item.days_before_event),
      priority: item.priority,
      is_mandatory: item.is_mandatory,
      created_by: ctx.userId,
    }))
  )

  if (error) return { ok: false, message: error.message }
  await dispatchPendingNotificationEmails()
  revalidatePath(`/events/${eventId}`)
  return { ok: true, message: `${items.length} task ditambahkan dari template` }
}
