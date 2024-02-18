export const compileMessage = (template: string, payload: Record<string, string> = {}) => template
  .replace(/{{\s*([^}\s]+)\s*}}/g, (_, key) => payload[key] || '');

export const buildWhatsAppLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
