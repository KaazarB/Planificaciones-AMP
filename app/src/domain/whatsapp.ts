// Capa de lógica: enlaces de WhatsApp (en el teléfono abre la app, en el computador WhatsApp Web)

// Deja el número listo para WhatsApp: solo dígitos y con código de Chile si falta
export function numeroWhatsapp(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  let n = valor.replace(/\D/g, '');
  if (n.length === 9 && n.startsWith('9')) n = `56${n}`;
  if (n.length === 8) n = `569${n}`;
  return n.length >= 10 ? n : '';
}

export const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
export const destinoWhatsapp = esMovil ? undefined : '_blank';

export function enlaceWhatsapp(numero: string, texto = ''): string {
  const t = texto ? `&text=${encodeURIComponent(texto)}` : '';
  return esMovil ? `whatsapp://send?phone=${numero}${t}` : `https://web.whatsapp.com/send?phone=${numero}${t}`;
}

export const enlaceApp = (): string => `${window.location.origin}${window.location.pathname}`;
