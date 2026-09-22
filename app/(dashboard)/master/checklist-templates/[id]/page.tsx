import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth/session"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChecklistTemplateToggle } from "./checklist-template-toggle"
import { ChecklistItemForm } from "./checklist-item-form"
import { ChecklistItemDeleteButton } from "./checklist-item-delete-button"

export default async function ChecklistTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth()
  const { id } = await params
  const supabase = await createClient()

  const [{ data: template }, { data: items }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("id, name, is_active, event_type, delivery_mode, min_participants, max_participants, trainings(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("checklist_template_items")
      .select("id, category, label, is_mandatory, sort_order")
      .eq("template_id", id)
      .order("sort_order"),
  ])

  if (!template) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{template.name}</h2>
          <p className="text-muted-foreground text-sm">
            {template.trainings?.name ?? "Semua training"} · {template.event_type ?? "Semua tipe"} ·{" "}
            {template.delivery_mode ?? "Semua mode"}
            {(template.min_participants || template.max_participants) &&
              ` · ${template.min_participants ?? 0}-${template.max_participants ?? "∞"} peserta`}
          </p>
        </div>
        <ChecklistTemplateToggle id={template.id} isActive={template.is_active} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Item Checklist ({items?.length ?? 0})</h3>

        {items && items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Wajib</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.category ?? "—"}</TableCell>
                  <TableCell>{item.label}</TableCell>
                  <TableCell>{item.is_mandatory && <Badge>Wajib</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <ChecklistItemDeleteButton itemId={item.id} templateId={template.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <ChecklistItemForm templateId={template.id} />
      </div>
    </div>
  )
}
