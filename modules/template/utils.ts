export const buildWhatsAppLink = (phone: string, textTemplate: string, payload: Record<string, unknown> = {}) => {
  const compiled = Object.entries(payload).reduce((acc, [key, value]) => acc.replace(`{{${key}}}`, String(value)), textTemplate);
  const text = encodeURIComponent(compiled);
  return `https://wa.me/${phone}?text=${text}`;
};
