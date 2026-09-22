"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"

export type ChecklistActionResult = { ok: boolean; message?: string }

export async function toggleEventChecklistItem(
  itemId: string,
  eventId: string,
  isDone: boolean
): Promise<ChecklistActionResult> {
  const ctx = await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase
    .from("event_checklists")
    .update({
      is_done: isDone,
      done_at: isDone ? new Date().toISOString() : null,
      done_by: isDone ? ctx.userId : null,
    })
    .eq("id", itemId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}
