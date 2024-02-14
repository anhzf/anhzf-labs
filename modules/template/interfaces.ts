import type { Input, Output } from 'valibot';
import type { RecipientSchema, TemplateSchema } from './schemas';

type ITemplate = Input<typeof TemplateSchema>;

type OTemplate = Output<typeof TemplateSchema>;

type IRecipient = Input<typeof RecipientSchema>;

type ORecipient = Output<typeof RecipientSchema>;

export interface TemplateService {
  // create(data: ITemplate): Promise<OTemplate>;
  get(id: string): Promise<OTemplate>;
  // list(id: string): Promise<OTemplate>;
  // update(id: string, data: ITemplate): Promise<OTemplate>;
  // delete(id: string): Promise<void>;
  addRecipient(id: string, data: IRecipient): Promise<ORecipient>;
}