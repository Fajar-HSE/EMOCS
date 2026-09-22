import { z } from "zod"

export const DOCUMENT_TYPES = [
  "PROPOSAL",
  "PO",
  "INVOICE",
  "ATTENDANCE",
  "MATERIAL",
  "CERTIFICATE",
  "PHOTO",
  "EVENT_REPORT",
  "EXPENSE_RECEIPT",
  "CONTRACT",
  "OTHER",
] as const

// File itself is uploaded straight to Storage from the browser client and
// isn't part of this schema — this only validates the row metadata that
// gets recorded afterward via recordDocumentUpload().
export const documentMetadataSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  file_name: z.string().min(1).max(255),
  storage_path: z.string().min(1),
  file_size: z.number().int().nonnegative().optional(),
  mime_type: z.string().max(150).optional(),
  is_mandatory: z.boolean(),
})
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>
