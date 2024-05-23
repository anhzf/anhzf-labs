import {
  any, boolean, coerce, object, optional, string, url,
} from "valibot";

const BooleanSchema = coerce(boolean(), Boolean);

export const PdfQuerySchema = object({
  url: string([url()]),
  landscape: optional(BooleanSchema),
  waitEvent: optional(BooleanSchema),
  printBackground: optional(BooleanSchema),
}, any());
