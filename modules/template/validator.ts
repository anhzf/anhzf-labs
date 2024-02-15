import { safeParse, pick } from 'valibot';
import { RecipientSchema, TemplateSchema } from '~/modules/template/schemas';

const ValidateTemplate = {
  create: (data: unknown) => {
    const { success, issues, output } = safeParse(TemplateSchema, data, { abortEarly: true });
    if (!success) throw createError({ cause: ['validation'], data: issues });
    return output;
  },

  update: (data: unknown) => {
    const { success, issues, output } = safeParse(pick(TemplateSchema, ['message']), data, { abortEarly: true });
    if (!success) throw createError({ cause: ['validation'], data: issues });
    return output;
  },

  createRecipient: (data: unknown) => {
    const { success, issues, output } = safeParse(RecipientSchema, data, { abortEarly: true });
    if (!success) throw createError({ cause: ['validation'], data: issues });
    return output;
  },
};

export default ValidateTemplate;
