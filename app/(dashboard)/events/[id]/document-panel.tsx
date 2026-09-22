"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { recordDocumentUpload, updateDocumentVerification, getDocumentSignedUrl } from "@/actions/document-actions"
import { DOCUMENT_TYPES } from "@/lib/validations/document"
import { DOCUMENT_TYPE_LABELS } from "@/lib/validations/labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Doc = {
  id: string
  document_type: string
  file_name: string
  storage_path: string
  is_mandatory: boolean
  verification_status: string
  verification_note: string | null
  uploader: { full_name: string } | null
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  VERIFIED: "default",
  REJECTED: "destructive",
}

export function DocumentPanel({
  eventId,
  documents,
  canVerify,
}: {
  eventId: string
  documents: Doc[]
  canVerify: boolean
}) {
  const [open, setOpen] = useState(false)
  const [docType, setDocType] = useState<string>("OTHER")
  const [isMandatory, setIsMandatory] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")

  async function handleUpload() {
    if (!file) {
      toast.error("Pilih file terlebih dahulu")
      return
    }
    setUploading(true)
    const supabase = createClient()
    const path = `${eventId}/${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file)
    if (uploadError) {
      toast.error(uploadError.message)
      setUploading(false)
      return
    }

    const result = await recordDocumentUpload(eventId, {
      document_type: docType,
      file_name: file.name,
      storage_path: path,
      file_size: file.size,
      mime_type: file.type || undefined,
      is_mandatory: isMandatory,
    })
    setUploading(false)
    if (!result.ok) {
      toast.error(result.message ?? "Gagal menyimpan dokumen")
      return
    }
    toast.success("Dokumen diunggah")
    setFile(null)
    setDocType("OTHER")
    setIsMandatory(false)
    setOpen(false)
  }

  async function handleDownload(storagePath: string) {
    // Open the tab synchronously, inside the click's user-gesture window —
    // opening it only after the awaited signed-url call below would get
    // silently blocked by popup blockers in a real browser.
    const tab = window.open("", "_blank", "noopener,noreferrer")
    const result = await getDocumentSignedUrl(storagePath)
    if (!result.ok || !result.url) {
      tab?.close()
      toast.error(result.message ?? "Gagal membuat link unduhan")
      return
    }
    if (tab) tab.location.href = result.url
  }

  function handleVerify(id: string) {
    startTransition(async () => {
      const r = await updateDocumentVerification(id, eventId, "VERIFIED")
      if (!r.ok) toast.error(r.message ?? "Gagal")
    })
  }

  function submitReject() {
    if (!rejectId) return
    if (!rejectNote.trim()) {
      toast.error("Alasan penolakan wajib diisi")
      return
    }
    startTransition(async () => {
      const r = await updateDocumentVerification(rejectId, eventId, "REJECTED", rejectNote)
      if (!r.ok) toast.error(r.message ?? "Gagal")
    })
    setRejectId(null)
    setRejectNote("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm">+ Dokumen</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unggah Dokumen</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5">Tipe Dokumen</Label>
                <Select
                  value={docType}
                  onValueChange={(v) => v && setDocType(v)}
                  items={DOCUMENT_TYPES.map((v) => ({
                    value: v,
                    label: DOCUMENT_TYPE_LABELS[v as keyof typeof DOCUMENT_TYPE_LABELS] ?? v,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {DOCUMENT_TYPE_LABELS[v as keyof typeof DOCUMENT_TYPE_LABELS] ?? v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">File</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="flex flex-row items-center gap-2">
                <Checkbox checked={isMandatory} onCheckedChange={(c) => setIsMandatory(!!c)} />
                <Label className="!mt-0">Dokumen wajib</Label>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={uploading} onClick={handleUpload}>
                {uploading ? "Mengunggah..." : "Unggah"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">Belum ada dokumen diunggah.</p>
      )}

      {documents.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Pengunggah</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {d.file_name}
                  {d.is_mandatory && (
                    <Badge variant="secondary" className="ml-1">
                      Wajib
                    </Badge>
                  )}
                  {d.verification_status === "REJECTED" && d.verification_note && (
                    <p className="text-muted-foreground text-xs">Alasan: {d.verification_note}</p>
                  )}
                </TableCell>
                <TableCell>{d.document_type}</TableCell>
                <TableCell>{d.uploader?.full_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[d.verification_status]}>{d.verification_status}</Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(d.storage_path)}>
                    Unduh
                  </Button>
                  {canVerify && d.verification_status === "PENDING" && (
                    <>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => handleVerify(d.id)}>
                        Verifikasi
                      </Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRejectId(d.id)}>
                        Tolak
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Dokumen</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="mb-1.5">Alasan Penolakan</Label>
            <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={submitReject}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
