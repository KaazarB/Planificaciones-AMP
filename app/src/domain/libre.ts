// Capa de lógica: entrenamiento libre (sesión que arma el propio atleta)

import type { Dia } from '../data/plan';
import type { SesionLibre } from '../data/registro';

import { serieHecha } from './progreso';
import { TIPO_CROSSFIT, wodTieneDatos } from './wod';

export const TIPOS_LIBRE = [TIPO_CROSSFIT, 'Fuerza', 'Gimnásticos', 'Cardio / carrera', 'Movilidad', 'Otro'];

export const sesionNueva = (): SesionLibre => ({ tipo: '', ejercicios: [{ nombre: '', series: [{}] }] });

// ¿Se anotó algo en la sesión libre?
export function tieneLibre(s?: SesionLibre): boolean {
  if (!s) return false;
  return Boolean(
    s.tipo ||
    s.minutos ||
    s.wod ||
    wodTieneDatos(s.wodArmado) ||
    (s.ejercicios ?? []).some((e) => e.nombre || e.series.some(serieHecha)),
  );
}

// Día del plan sin entrenamiento cargado (descanso, viaje, «clase en el box»…): no trae secciones.
// Ahí lo primero es anotar lo que entrenó y después el «Registro al terminar».
// Las carreras sin secciones sí traen su entrenamiento: el objetivo y sus campos de registro.
export const sinEntrenamientoCargado = (d: Dia): boolean => !(d.secciones ?? []).length && d.tipo !== 'carrera';
