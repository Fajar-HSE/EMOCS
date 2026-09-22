"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { documentMetadataSchema } from "@/lib/validations/document"

export type DocumentActionResult = { ok: boolean; message?: string; url?: string }

// The file itself is uploaded straight from the browser to the private
// `documents` Storage bucket (see document-panel.tsx) — this only records
// the metadata row once that upload has already succeeded. RLS requires
// uploaded_by = auth.uid(), so any authenticated user who can see the event
// can attach a document (documents_insert policy has no role restriction).
export async function recordDocumentUpload(eventId: string, input: unknown): Promise<DocumentActionResult> {
  const ctx = await requireAuth()
  const parsed = documentMetadataSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from("documents").insert({
    event_id: eventId,
    document_type: parsed.data.document_type,
    file_name: parsed.data.file_name,
    storage_path: parsed.data.storage_path,
    file_size: parsed.data.file_size ?? null,
    mime_type: parsed.data.mime_type ?? null,
    is_mandatory: parsed.data.is_mandatory,
    uploaded_by: ctx.userId,
  })

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function updateDocumentVerification(
  id: string,
  eventId: string,
  status: "VERIFIED" | "REJECTED",
  note?: string
): Promise<DocumentActionResult> {
  const ctx = await requireAuth()
  const supabase = await createClient()
  const { error } = await supabase
    .from("documents")
    .update({
      verification_status: status,
      verification_note: note || null,
      verified_by: ctx.userId,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/events/${eventId}`)
  return { ok: true }
}

export async function getDocumentSignedUrl(storagePath: string): Promise<DocumentActionResult> {
  await requireAuth()
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60)
  if (error || !data) return { ok: false, message: error?.message ?? "Gagal membuat link unduhan" }
  return { ok: true, url: data.signedUrl }
}
