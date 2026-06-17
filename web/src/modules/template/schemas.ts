import { z } from 'zod'

export const TemplateSchema = z.object({
  title: z.string(),
  message: z.string(),
  createdAt: z.any(), // Firestore Timestamp
})

export const RecipientSchema = z.object({
  name: z.string(),
  contactNumber: z.string().optional(),
  labels: z.record(z.string(), z.unknown()).optional().default({}),
})

export type Template = z.infer<typeof TemplateSchema>
export type Recipient = z.infer<typeof RecipientSchema>
