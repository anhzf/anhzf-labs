import { z } from 'zod'

export const addTransactionSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').transform(s => s.trim().toUpperCase()),
  type: z.enum(['BUY', 'SELL']),
  qty: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  date: z.any(), // Firestore Timestamp or Date
  fee: z.number().min(0, 'Fee cannot be negative').default(0),
  notes: z.string().default(''),
})

export const addThesisSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').transform(s => s.trim().toUpperCase()),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  notes: z.string().min(1, 'Notes are required'),
  linkedTransactionId: z.string().nullable().default(null),
})

export const updatePriceSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').transform(s => s.trim().toUpperCase()),
  price: z.number().positive('Price must be positive'),
})

export type AddTransactionInput = z.infer<typeof addTransactionSchema>
export type AddThesisInput = z.infer<typeof addThesisSchema>
export type UpdatePriceInput = z.infer<typeof updatePriceSchema>
