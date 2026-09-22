"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"

export async function markNotificationRead(id: string) {
  await requireAuth()
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
  revalidatePath("/dashboard")
}

export async function markAllNotificationsRead() {
  const ctx = await requireAuth()
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_user_id", ctx.userId)
    .eq("is_read", false)
  revalidatePath("/dashboard")
}
