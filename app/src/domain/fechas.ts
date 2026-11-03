// Capa de lógica: fechas de inicio de plan

const aFecha = (iso: string): Date => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

const aISO = (f: Date): string =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

export const hoyISO = (): string => aISO(new Date());

// Primer lunes desde esa fecha (si ya es lunes, la misma): el plan nunca parte antes de lo pedido
export function lunesDeISO(iso: string): string {
  const f = aFecha(iso);
  const dia = f.getDay();
  f.setDate(f.getDate() + ((8 - dia) % 7));
  return aISO(f);
}

// «lunes 16 de noviembre»
export function fechaLarga(iso: string): string {
  const f = aFecha(iso);
  const dia = f.toLocaleDateString('es-CL', { weekday: 'long' });
  const mes = f.toLocaleDateString('es-CL', { month: 'long' });
  return `${dia} ${f.getDate()} de ${mes}`;
}

export const esFechaISO = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
