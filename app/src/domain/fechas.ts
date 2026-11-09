// Capa de lógica: fechas de inicio de plan

const aFecha = (iso: string): Date => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

const aISO = (f: Date): string =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

export const hoyISO = (): string => aISO(new Date());

// Fecha local AAAA-MM-DD de una marca de tiempo de Supabase (p. ej. «creado» o «actualizado»)
export function fechaDeMarca(marca: string): string {
  const f = new Date(marca);
  return Number.isNaN(f.getTime()) ? marca.slice(0, 10) : aISO(f);
}

// «hoy», «ayer» o «hace N días»
export const haceDias = (dias: number): string => (dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`);

// Primer lunes desde esa fecha (si ya es lunes, la misma): el plan nunca parte antes de lo pedido
export function lunesDeISO(iso: string): string {
  const f = aFecha(iso);
  const dia = f.getDay();
  f.setDate(f.getDate() + ((8 - dia) % 7));
  return aISO(f);
}

// «lunes 16 de noviembre» (con el año si no es el actual)
export function fechaLarga(iso: string): string {
  const f = aFecha(iso);
  const dia = f.toLocaleDateString('es-CL', { weekday: 'long' });
  const mes = f.toLocaleDateString('es-CL', { month: 'long' });
  const anio = f.getFullYear() !== new Date().getFullYear() ? ` de ${f.getFullYear()}` : '';
  return `${dia} ${f.getDate()} de ${mes}${anio}`;
}

// Días entre dos fechas AAAA-MM-DD (negativo si «hasta» ya pasó)
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / (24 * 3600 * 1000));
}

// Día siguiente a una fecha AAAA-MM-DD
export function diaSiguiente(iso: string): string {
  const f = aFecha(iso);
  f.setDate(f.getDate() + 1);
  return aISO(f);
}

// Semanas completas entre dos fechas AAAA-MM-DD
export function semanasEntre(desde: string, hasta: string): number {
  return Math.floor((aFecha(hasta).getTime() - aFecha(desde).getTime()) / (7 * 24 * 3600 * 1000));
}

export const esFechaISO = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
