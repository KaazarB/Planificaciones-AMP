import { describe, expect, it } from 'vitest';

import type { Dia } from '../data/plan';
import type { WodArmado } from '../data/registro';

import { sinEntrenamientoCargado, tieneLibre } from './libre';
import {
  formatearTiempo,
  limpiarWod,
  movimientosSugeridos,
  preguntaRondas,
  preguntaTiempo,
  resultadoWod,
  tituloWod,
  wodTieneDatos,
} from './wod';

const wod = (w: Partial<WodArmado>): WodArmado => ({ formato: '', ejercicios: [], ...w });

describe('WOD armado', () => {
  it('resume cada formato con lo que significa su tiempo y sus rondas', () => {
    expect(tituloWod(wod({ formato: 'AMRAP', minutos: '12', rondas: '6' }))).toBe('AMRAP 12 min');
    expect(tituloWod(wod({ formato: 'For Time', rondas: '3', minutos: '15' }))).toBe(
      'For Time · 3 rondas · time cap 15 min',
    );
    expect(tituloWod(wod({ formato: 'For Time', rondas: '1' }))).toBe('For Time · 1 ronda');
    expect(tituloWod(wod({ formato: 'EMOM', minutos: '10', rondas: '10' }))).toBe('EMOM 10 min · 10 rondas');
    expect(tituloWod(wod({ formato: 'Intervalos', rondas: '3', descanso: '3' }))).toBe(
      'Intervalos · 3 sets · 3 min de descanso',
    );
    expect(tituloWod(wod({ formato: 'Otro', minutos: '20' }))).toBe('WOD · 20 min');
  });

  it('el resultado es el tiempo en For Time y las rondas + reps en AMRAP', () => {
    expect(resultadoWod(wod({ formato: 'For Time', tiempo: '6:30' }))).toBe('Tiempo: 6:30');
    expect(resultadoWod(wod({ formato: 'AMRAP', rondas: '6', repsExtra: '4' }))).toBe('6 rondas + 4 reps');
    expect(resultadoWod(wod({ formato: 'AMRAP', rondas: '1' }))).toBe('1 ronda');
    expect(resultadoWod(wod({ formato: 'EMOM', rondas: '10' }))).toBe('');
    // Un tiempo anotado con otro formato no se muestra como resultado
    expect(resultadoWod(wod({ formato: 'AMRAP', tiempo: '6:30' }))).toBe('');
  });

  it('las preguntas de los pasos cambian según el formato', () => {
    expect(preguntaTiempo(wod({ formato: 'For Time' })).campos.map((c) => c.clave)).toEqual(['tiempo', 'minutos']);
    expect(preguntaRondas(wod({ formato: 'AMRAP' })).campos.map((c) => c.clave)).toEqual(['rondas', 'repsExtra']);
    expect(preguntaTiempo(wod({ formato: 'Intervalos' })).campos.map((c) => c.clave)).toEqual(['minutos', 'descanso']);
    expect(preguntaTiempo(wod({ formato: '' })).pregunta).toBe('¿Cuánto duró?');
  });

  it('formatea el tiempo final escrito en dos casillas', () => {
    expect(formatearTiempo('6:30')).toBe('6:30');
    expect(formatearTiempo('6:7')).toBe('6:07');
    expect(formatearTiempo('6:')).toBe('6:00');
    expect(formatearTiempo(':45')).toBe('0:45');
    expect(formatearTiempo('6:75')).toBe('7:15');
    expect(formatearTiempo(undefined)).toBe('');
  });

  it('al terminar quita las filas vacías y no deja un WOD sin datos', () => {
    const w = wod({
      formato: 'AMRAP',
      ejercicios: [{ nombre: 'Wall ball', reps: '10' }, { nombre: '' }, { nombre: ' ', reps: '' }],
    });
    expect(limpiarWod(w)?.ejercicios).toEqual([{ nombre: 'Wall ball', reps: '10' }]);
    expect(limpiarWod(wod({ ejercicios: [{ nombre: '' }] }))).toBeUndefined();
    expect(wodTieneDatos(wod({ ejercicios: [{ nombre: '', kg: '20' }] }))).toBe(true);
    expect(wodTieneDatos(wod({ tiempo: ':' }))).toBe(false);
  });

  it('sugiere movimientos de CrossFit junto con los ejercicios del plan, sin repetir', () => {
    const lista = movimientosSugeridos(['Thruster', 'thruster', 'Hip thrust']);
    expect(lista).toContain('Hip thrust');
    expect(lista.filter((n) => n.toLowerCase() === 'thruster')).toHaveLength(1);
  });
});

describe('Entrenamiento libre', () => {
  const dia = (d: Partial<Dia>): Dia => ({
    fecha: '2026-11-11',
    dia: 'Miércoles 11',
    bloque: 1,
    semana: 2,
    fase: 'Base',
    tipo: 'descanso',
    titulo: 'Descanso',
    objetivo: '',
    ...d,
  });

  it('un día sin secciones no trae entrenamiento cargado, salvo una carrera', () => {
    expect(sinEntrenamientoCargado(dia({ tipo: 'descanso' }))).toBe(true);
    expect(sinEntrenamientoCargado(dia({ tipo: 'clase', titulo: 'Clase en el box (opcional)' }))).toBe(true);
    expect(sinEntrenamientoCargado(dia({ tipo: 'viaje', secciones: [] }))).toBe(true);
    expect(sinEntrenamientoCargado(dia({ tipo: 'carrera', titulo: 'Carrera Z2' }))).toBe(false);
    expect(
      sinEntrenamientoCargado(
        dia({ tipo: 'sesion', secciones: [{ titulo: 'Fuerza', check: false, nota: '', items: [] }] }),
      ),
    ).toBe(false);
  });

  it('un WOD armado cuenta como entrenamiento anotado', () => {
    expect(tieneLibre({ tipo: '', ejercicios: [], wodArmado: wod({ formato: 'EMOM' }) })).toBe(true);
    expect(tieneLibre({ tipo: '', ejercicios: [], wodArmado: wod({}) })).toBe(false);
  });
});
