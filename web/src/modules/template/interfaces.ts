import type { Recipient, Template } from './schemas'

export type { Recipient, Template }

export interface TemplateService {
  update: (id: string, data: Pick<Template, 'message'>) => Promise<void>
  addRecipient: (
    id: string,
    ...data: [Recipient, ...Recipient[]]
  ) => Promise<string[]>
  updateRecipient: (
    id: string,
    recipientId: string,
    data: Partial<Recipient>,
  ) => Promise<void>
  deleteRecipient: (id: string, recipientId: string) => Promise<void>
}
