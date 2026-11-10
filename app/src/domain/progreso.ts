// Capa de lógica: progreso de una sección del día

import type { Item, Seccion } from '../data/plan';
import { claveItem } from '../data/plan';
import type { FilaSerie, RegistroDia } from '../data/registro';

// Una serie cuenta como hecha si se marcó con ✓ o si se anotó algún número
export const serieHecha = (f?: FilaSerie): boolean => Boolean(f && (f.hecha || f.kg || f.reps || f.seg));

const conSeries = (item: Item) => Boolean(item.series && item.campos?.length);

// Series hechas / planificadas de una sección (solo ejercicios con series; para las métricas del coach)
export function seriesSeccion(seccion: Seccion, si: number, reg: RegistroDia): [number, number] {
  let total = 0;
  let hechas = 0;
  seccion.items.forEach((item, ii) => {
    if (!item.series) return;
    total += item.series;
    const filas = reg.series[claveItem(si, ii)] ?? [];
    hechas += filas.slice(0, item.series).filter(serieHecha).length;
  });
  return [hechas, total];
}

// Cuenta lo hecho / lo total de una sección: cada serie y cada ítem suelto (WOD, notas) suman uno
export function progresoSeccion(seccion: Seccion, si: number, reg: RegistroDia): [number, number] | null {
  if (seccion.check) {
    const hechos = seccion.items.filter((_, ii) => reg.checks[claveItem(si, ii)]).length;
    return [hechos, seccion.items.length];
  }
  let [hechas, total] = seriesSeccion(seccion, si, reg);
  seccion.items.forEach((item, ii) => {
    if (conSeries(item)) return;
    total += 1;
    if (reg.checks[claveItem(si, ii)]) hechas += 1;
  });
  return total > 0 ? [hechas, total] : null;
}
