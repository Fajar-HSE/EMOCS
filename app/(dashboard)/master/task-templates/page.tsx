import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { TaskTemplateDialog } from "./task-template-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function TaskTemplatesPage() {
  await requireAuth()
  const supabase = await createClient()
  const { data: templates, error } = await supabase
    .from("task_templates")
    .select("id, name, event_type, delivery_mode, is_active, task_template_items(count)")
    .is("deleted_at", null)
    .order("name")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {templates?.length ?? 0} template task terdaftar
        </p>
        <TaskTemplateDialog />
      </div>

      {error && <p className="text-destructive text-sm">{error.message}</p>}

      {!error && templates?.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada template task. Template ini dipakai untuk membuat sekumpulan task standar
          sekaligus pada sebuah event (FR-TSK-04).
        </p>
      )}

      {templates && templates.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Template</TableHead>
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
                  <Link href={`/master/task-templates/${t.id}`} className="hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell>{t.event_type ?? "Semua"}</TableCell>
                <TableCell>{t.delivery_mode ?? "Semua"}</TableCell>
                <TableCell>{t.task_template_items?.[0]?.count ?? 0}</TableCell>
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
