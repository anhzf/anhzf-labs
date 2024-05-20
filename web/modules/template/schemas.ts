import {
  object, optional, record, string,
} from 'valibot';
import { timestamp } from '~/lib/schemas';

export const TemplateSchema = object({
  title: string(),
  message: string(),
  createdAt: timestamp,
});

export const RecipientSchema = object({
  name: string(),
  contactNumber: optional(string()),
  labels: optional(record(string()), {}),
});
