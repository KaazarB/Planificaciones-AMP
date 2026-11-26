// Capa de lógica: resumen de un entrenamiento registrado para compartirlo en Instagram (story)

import type { Dia } from '../data/plan';
import { claveItem } from '../data/plan';
import type { FilaSerie, RegistroDia } from '../data/registro';

import { fechaLarga } from './fechas';
import { tieneLibre } from './libre';
import { numero } from './metricas';
import { serieHecha } from './progreso';
import { resultadoWod, tituloWod } from './wod';

export interface LineaHistoria {
  nombre: string;
  detalle: string; // «50 kg × 8», «4 series», «AMRAP 12 min · 5 rondas»
}

export interface ResumenHistoria {
  apodo: string;
  fecha: string; // «miércoles 25 de noviembre»
  titulo: string;
  lineas: LineaHistoria[]; // ejercicios destacados (máximo MAX_LINEAS)
  masEjercicios: number; // ejercicios hechos que no caben en la imagen
  series: number; // series hechas
  tonelaje: number; // kg × reps
  minutos: number | null;
  rpe: number | null;
}

export const MAX_LINEAS = 5;

const kgTexto = (kg: number) => `${String(Math.round(kg * 10) / 10).replace('.', ',')} kg`;

// Mejor serie de un ejercicio: la más pesada (o la de más repeticiones si no lleva peso)
function detalleSeries(filas: FilaSerie[]): string {
  const hechas = filas.filter(serieHecha);
  if (!hechas.length) return '';
  let mejor: FilaSerie | undefined;
  let mejorKg = 0;
  for (const f of hechas) {
    const kg = numero(f.kg) ?? 0;
    if (kg > mejorKg) {
      mejorKg = kg;
      mejor = f;
    }
  }
  const nSeries = `${hechas.length} ${hechas.length === 1 ? 'serie' : 'series'}`;
  if (mejor)
    return mejor.reps ? `${kgTexto(mejorKg)} × ${mejor.reps} · ${nSeries}` : `${kgTexto(mejorKg)} · ${nSeries}`;
  const reps = Math.max(0, ...hechas.map((f) => numero(f.reps) ?? 0));
  if (reps) return `${nSeries} · hasta ${reps} reps`;
  const seg = Math.max(0, ...hechas.map((f) => numero(f.seg) ?? 0));
  return seg ? `${nSeries} · hasta ${seg} s` : nSeries;
}

const tonelajeDe = (filas: FilaSerie[]) =>
  filas.filter(serieHecha).reduce((t, f) => t + (numero(f.kg) ?? 0) * (numero(f.reps) ?? 0), 0);

// ¿Hay algo que mostrar? (ejercicios, series o al menos el esfuerzo de una clase)
export const hayQueCompartir = (r: ResumenHistoria): boolean => r.lineas.length > 0 || r.series > 0 || r.rpe !== null;

export function resumenHistoria(dia: Dia | undefined, reg: RegistroDia, apodo: string): ResumenHistoria {
  const todas: LineaHistoria[] = [];
  let series = 0;
  let tonelaje = 0;

  // Ejercicios del plan con series anotadas
  (dia?.secciones ?? []).forEach((sec, si) => {
    if (sec.check) return;
    sec.items.forEach((item, ii) => {
      const clave = claveItem(si, ii);
      const filas = (reg.series[clave] ?? []).slice(0, item.series ?? undefined);
      const detalle = detalleSeries(filas);
      if (!detalle) return;
      series += filas.filter(serieHecha).length;
      tonelaje += tonelajeDe(filas);
      todas.push({ nombre: reg.sustituciones?.[clave] || item.nombre, detalle });
    });
  });

  // Entrenamiento libre (extra, o el del día si no había nada planificado)
  const libre = tieneLibre(reg.libre) ? reg.libre : undefined;
  if (libre?.wodArmado?.formato) {
    const w = libre.wodArmado;
    const detalle = [tituloWod(w), resultadoWod(w)].filter(Boolean).join(' · ');
    const movimientos = w.ejercicios.map((e) => e.nombre.trim()).filter(Boolean);
    todas.push({ nombre: movimientos.length ? movimientos.slice(0, 3).join(' · ') : 'WOD', detalle });
  }
  for (const e of libre?.ejercicios ?? []) {
    const detalle = detalleSeries(e.series);
    if (!e.nombre.trim() || !detalle) continue;
    series += e.series.filter(serieHecha).length;
    tonelaje += tonelajeDe(e.series);
    todas.push({ nombre: e.nombre.trim(), detalle });
  }

  // Se respeta el orden en que lo entrenó
  const lineas = todas.slice(0, MAX_LINEAS);
  // Con sesión del plan va su título; si no, el tipo de entrenamiento libre que anotó
  const titulo = (dia?.secciones?.length ? dia.titulo : libre?.tipo || dia?.titulo) || 'Entrenamiento';

  return {
    apodo,
    fecha: fechaLarga(reg.fecha),
    titulo,
    lineas,
    masEjercicios: todas.length - lineas.length,
    series,
    tonelaje: Math.round(tonelaje),
    minutos: numero(libre?.minutos) ?? null,
    rpe: reg.rpe ?? null,
  };
}
