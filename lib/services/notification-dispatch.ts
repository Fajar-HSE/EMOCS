import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "./email-service"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

/**
 * Sends any EMAIL-channel notification_deliveries left PENDING by
 * create_notification() (see migration 0022). Called right after the
 * Server Actions that trigger a notification (event transition, PIC
 * assignment, task assignment) so delivery is near-instant without needing
 * a cron or a Postgres->HTTP bridge (pg_net/Vault). Never let a failure
 * here surface to the caller — an email hiccup must not block the
 * underlying workflow action it rode in on.
 */
export async function dispatchPendingNotificationEmails(limit = 20): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: deliveries, error } = await admin
      .from("notification_deliveries")
      .select(
        "id, notifications(title, body, link_url, recipient_user_id, profiles(email, is_active))"
      )
      .eq("channel", "EMAIL")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(limit)

    if (error || !deliveries?.length) return

    for (const delivery of deliveries) {
      const notification = delivery.notifications
      const profile = notification?.profiles

      if (!notification || !profile || !profile.is_active) {
        await admin
          .from("notification_deliveries")
          .update({ status: "FAILED", error: "Recipient tidak aktif/tidak ditemukan" })
          .eq("id", delivery.id)
        continue
      }

      try {
        await sendEmail({
          to: profile.email,
          subject: notification.title,
          html: renderNotificationEmail(notification.title, notification.body, notification.link_url),
        })
        await admin
          .from("notification_deliveries")
          .update({ status: "SENT", sent_at: new Date().toISOString() })
          .eq("id", delivery.id)
      } catch (err) {
        await admin
          .from("notification_deliveries")
          .update({ status: "FAILED", error: err instanceof Error ? err.message : String(err) })
          .eq("id", delivery.id)
      }
    }
  } catch (err) {
    console.error("dispatchPendingNotificationEmails failed:", err)
  }
}

function renderNotificationEmail(title: string, body: string | null, linkUrl: string | null): string {
  const link = linkUrl ? `${APP_URL}${linkUrl}` : APP_URL
  return `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2 style="margin-bottom: 4px;">${escapeHtml(title)}</h2>
      ${body ? `<p style="color:#555;">${escapeHtml(body)}</p>` : ""}
      <p><a href="${link}" style="color:#2563eb;">Buka di EMOCS &rarr;</a></p>
    </div>
  `
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
  return value.replace(/[&<>"']/g, (c) => map[c])
}
