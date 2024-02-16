export const compileMessage = (template: string, payload: Record<string, unknown> = {}) => Object.entries(payload)
  .reduce((acc, [key, value]) => acc.replace(`{{${key}}}`, String(value)), template);

export const buildWhatsAppLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
