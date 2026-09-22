import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { createDraftAndRedirect } from "@/actions/event-actions"
import { EventWizard } from "./event-wizard"

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>
}) {
  await requireAuth()
  const { draft } = await searchParams

  if (!draft) {
    await createDraftAndRedirect()
    return null
  }

  const supabase = await createClient()

  const [{ data: event }, { data: customers }, { data: trainings }, { data: cities }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", draft).eq("status", "DRAFT").maybeSingle(),
      supabase.from("customers").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("trainings").select("id, name, code").eq("is_active", true).is("deleted_at", null).order("name"),
      supabase.from("cities").select("id, name").is("deleted_at", null).order("name"),
    ])

  if (!event) {
    redirect("/events")
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Event Request Baru</h1>
        <p className="text-muted-foreground text-sm">
          Isi dalam ≤3 menit. Draft tersimpan otomatis.
        </p>
      </div>
      <EventWizard
        draftId={draft}
        initialEvent={event}
        customers={customers ?? []}
        trainings={trainings ?? []}
        cities={cities ?? []}
      />
    </div>
  )
}
