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
import { TaskTemplateToggle } from "./task-template-toggle"
import { TaskItemForm } from "./task-item-form"
import { TaskItemDeleteButton } from "./task-item-delete-button"

export default async function TaskTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth()
  const { id } = await params
  const supabase = await createClient()

  const [{ data: template }, { data: items }] = await Promise.all([
    supabase
      .from("task_templates")
      .select("id, name, is_active, event_type, delivery_mode")
      .eq("id", id)
      .single(),
    supabase
      .from("task_template_items")
      .select("id, title, description, days_before_event, priority, is_mandatory, sort_order")
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
            {template.event_type ?? "Semua tipe"} · {template.delivery_mode ?? "Semua mode"}
          </p>
        </div>
        <TaskTemplateToggle id={template.id} isActive={template.is_active} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Item Task ({items?.length ?? 0})</h3>

        {items && items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>H- (hari sebelum event)</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Wajib</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.title}</div>
                    {item.description && (
                      <div className="text-muted-foreground text-xs">{item.description}</div>
                    )}
                  </TableCell>
                  <TableCell>H-{item.days_before_event}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.priority}</Badge>
                  </TableCell>
                  <TableCell>{item.is_mandatory && <Badge>Wajib</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <TaskItemDeleteButton itemId={item.id} templateId={template.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <TaskItemForm templateId={template.id} />
      </div>
    </div>
  )
}
