"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/session"
import {
  checklistTemplateSchema,
  checklistTemplateItemSchema,
  taskTemplateSchema,
  taskTemplateItemSchema,
} from "@/lib/validations/templates"

export type TemplateActionResult = { ok: boolean; message?: string; id?: string }

function fromZodError(error: { message: string }): TemplateActionResult {
  return { ok: false, message: error.message }
}

// ---------------------------------------------------------------
// Checklist templates (§13.4-ish, FR-CHK / find_checklist_template())
// ---------------------------------------------------------------

export async function createChecklistTemplate(input: unknown): Promise<TemplateActionResult> {
  const ctx = await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = checklistTemplateSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("checklist_templates")
    .insert({
      company_id: ctx.profile.company_id,
      name: parsed.data.name,
      training_id: parsed.data.training_id || null,
      event_type: parsed.data.event_type || null,
      delivery_mode: parsed.data.delivery_mode || null,
      min_participants: parsed.data.min_participants ?? null,
      max_participants: parsed.data.max_participants ?? null,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/checklist-templates")
  return { ok: true, id: data.id }
}

export async function toggleChecklistTemplateActive(id: string, isActive: boolean): Promise<TemplateActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.from("checklist_templates").update({ is_active: isActive }).eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/checklist-templates")
  return { ok: true }
}

export async function addChecklistTemplateItem(templateId: string, input: unknown): Promise<TemplateActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = checklistTemplateItemSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { count } = await supabase
    .from("checklist_template_items")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId)

  const { error } = await supabase.from("checklist_template_items").insert({
    template_id: templateId,
    category: parsed.data.category || null,
    label: parsed.data.label,
    is_mandatory: parsed.data.is_mandatory,
    sort_order: ((count ?? 0) + 1) * 10,
  })

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/master/checklist-templates/${templateId}`)
  return { ok: true }
}

export async function deleteChecklistTemplateItem(itemId: string, templateId: string): Promise<TemplateActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.from("checklist_template_items").delete().eq("id", itemId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/master/checklist-templates/${templateId}`)
  return { ok: true }
}

// ---------------------------------------------------------------
// Task templates (FR-TSK-04 — bulk-create via computeTaskTemplateDueDates)
// ---------------------------------------------------------------

export async function createTaskTemplate(input: unknown): Promise<TemplateActionResult> {
  const ctx = await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = taskTemplateSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])
  if (!ctx.profile) return { ok: false, message: "Profil tidak ditemukan" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("task_templates")
    .insert({
      company_id: ctx.profile.company_id,
      name: parsed.data.name,
      event_type: parsed.data.event_type || null,
      delivery_mode: parsed.data.delivery_mode || null,
    })
    .select("id")
    .single()

  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/task-templates")
  return { ok: true, id: data.id }
}

export async function toggleTaskTemplateActive(id: string, isActive: boolean): Promise<TemplateActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.from("task_templates").update({ is_active: isActive }).eq("id", id)
  if (error) return { ok: false, message: error.message }
  revalidatePath("/master/task-templates")
  return { ok: true }
}

export async function addTaskTemplateItem(templateId: string, input: unknown): Promise<TemplateActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const parsed = taskTemplateItemSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error.issues[0])

  const supabase = await createClient()
  const { count } = await supabase
    .from("task_template_items")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId)

  const { error } = await supabase.from("task_template_items").insert({
    template_id: templateId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    days_before_event: parsed.data.days_before_event,
    priority: parsed.data.priority,
    is_mandatory: parsed.data.is_mandatory,
    sort_order: ((count ?? 0) + 1) * 10,
  })

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/master/task-templates/${templateId}`)
  return { ok: true }
}

export async function deleteTaskTemplateItem(itemId: string, templateId: string): Promise<TemplateActionResult> {
  await requireRole("OPERATIONS_MANAGER", "ADMIN")
  const supabase = await createClient()
  const { error } = await supabase.from("task_template_items").delete().eq("id", itemId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/master/task-templates/${templateId}`)
  return { ok: true }
}
