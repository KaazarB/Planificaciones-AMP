// Capa de lógica: entrenamiento libre (sesión que arma el propio atleta)

import type { SesionLibre } from '../data/registro';

import { serieHecha } from './progreso';

export const TIPOS_LIBRE = ['Clase CrossFit', 'Fuerza', 'Gimnásticos', 'Cardio / carrera', 'Movilidad', 'Otro'];

export const sesionNueva = (): SesionLibre => ({ tipo: '', ejercicios: [{ nombre: '', series: [{}] }] });

// ¿Se anotó algo en la sesión libre?
export function tieneLibre(s?: SesionLibre): boolean {
  if (!s) return false;
  return Boolean(
    s.tipo || s.minutos || s.wod || (s.ejercicios ?? []).some((e) => e.nombre || e.series.some(serieHecha)),
  );
}
