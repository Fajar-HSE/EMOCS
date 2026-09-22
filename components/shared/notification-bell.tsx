"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BellIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notification-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type Notification = {
  id: string
  title: string
  body: string | null
  link_url: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell({
  userId,
  initialNotifications,
}: {
  userId: string
  initialNotifications: Notification[]
}) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const unreadCount = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    // Realtime's websocket auth must be set from a real session token
    // *before* subscribing — joining while the client still only has the
    // anon key means the server evaluates RLS as anon (no policy for that
    // role on notifications), so every change is silently filtered out.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token)
      }

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_user_id=eq.${userId}` },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20))
          }
        )
        .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])

  async function handleClick(n: Notification) {
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      await markNotificationRead(n.id)
    }
    if (n.link_url) router.push(n.link_url)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <BellIcon className="size-4" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-2">
          <span className="text-sm font-medium">Notifikasi</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })))
                await markAllNotificationsRead()
              }}
            >
              Tandai semua dibaca
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="text-muted-foreground p-4 text-center text-sm">Belum ada notifikasi.</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full border-b p-2.5 text-left text-sm last:border-b-0 hover:bg-muted ${
                n.is_read ? "" : "bg-accent/50"
              }`}
            >
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-muted-foreground line-clamp-2 text-xs">{n.body}</p>}
              <p className="text-muted-foreground mt-1 text-[10px]">
                {new Date(n.created_at).toLocaleString("id-ID")}
              </p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
