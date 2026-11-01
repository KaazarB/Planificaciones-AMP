// Capa de lógica: progreso de una sección del día

import type { Seccion } from '../data/plan';
import { claveItem } from '../data/plan';
import type { RegistroDia } from '../data/registro';

// Cuenta lo hecho / lo total de una sección (null = sin contador, como el WOD)
export function progresoSeccion(seccion: Seccion, si: number, reg: RegistroDia): [number, number] | null {
  if (seccion.check) {
    const hechos = seccion.items.filter((_, ii) => reg.checks[claveItem(si, ii)]).length;
    return [hechos, seccion.items.length];
  }
  let total = 0;
  let hechas = 0;
  seccion.items.forEach((item, ii) => {
    if (!item.series) return;
    total += item.series;
    const filas = reg.series[claveItem(si, ii)] ?? [];
    hechas += filas.slice(0, item.series).filter((f) => f && (f.kg || f.reps || f.seg)).length;
  });
  return total > 0 ? [hechas, total] : null;
}
