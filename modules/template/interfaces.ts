import type { Input, Output } from 'valibot';
import type { RecipientSchema, TemplateSchema } from './schemas';

export type InTemplate = Input<typeof TemplateSchema>;

export type OutTemplate = Output<typeof TemplateSchema>;

export type InRecipient = Input<typeof RecipientSchema>;

export type OutRecipient = Output<typeof RecipientSchema>;

export interface TemplateService {
  update(id: string, data: Pick<InTemplate, 'message'>): Promise<void>;
  addRecipient(id: string, data: InRecipient): Promise<string>;
  deleteRecipient(id: string, recipientId: string): Promise<void>;
}
