import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { ChecklistTemplateDialog } from "./checklist-template-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function ChecklistTemplatesPage() {
  await requireAuth()
  const supabase = await createClient()
  const [{ data: templates, error }, { data: trainings }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("id, name, event_type, delivery_mode, is_active, trainings(name), checklist_template_items(count)")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("trainings").select("id, name").is("deleted_at", null).order("name"),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {templates?.length ?? 0} template checklist terdaftar
        </p>
        <ChecklistTemplateDialog trainings={trainings ?? []} />
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && templates?.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada template checklist. Checklist event akan digenerate otomatis dari template
          yang paling cocok (training/tipe event/mode delivery) saat PIC ditugaskan.
        </p>
      )}

      {templates && templates.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Template</TableHead>
              <TableHead>Training</TableHead>
              <TableHead>Tipe Event</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <Link href={`/master/checklist-templates/${t.id}`} className="hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell>{t.trainings?.name ?? "Semua training"}</TableCell>
                <TableCell>{t.event_type ?? "Semua"}</TableCell>
                <TableCell>{t.delivery_mode ?? "Semua"}</TableCell>
                <TableCell>{t.checklist_template_items?.[0]?.count ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={t.is_active ? "default" : "secondary"}>
                    {t.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
