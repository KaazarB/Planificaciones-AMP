import { describe, expect, it } from 'vitest';

import type { Dia } from '../data/plan';
import { registroVacio } from '../data/registro';

import { hayQueCompartir, resumenHistoria } from './historia';

const dia: Dia = {
  fecha: '2026-11-25',
  dia: 'Miércoles 25 de noviembre',
  bloque: 1,
  semana: 0,
  fase: 'Introducción',
  tipo: 'sesion',
  titulo: 'Torso A · press banca y remo',
  objetivo: '',
  secciones: [
    { titulo: 'Calentamiento', check: true, nota: '', items: [{ nombre: 'Bike', presc: '4 min' }] },
    {
      titulo: 'Fuerza',
      check: false,
      nota: '',
      items: [
        { nombre: 'Press banca con barra', presc: '3 × 8', series: 3, campos: ['kg', 'reps'] },
        { nombre: 'Remo en polea sentado', presc: '3 × 10', series: 3, campos: ['kg', 'reps'] },
        { nombre: 'Flexiones', presc: '2 × máx.', series: 2, campos: ['reps'] },
      ],
    },
  ],
};

describe('Resumen para compartir en Instagram', () => {
  it('muestra la mejor serie de cada ejercicio, las series hechas y los kg movidos', () => {
    const reg = {
      ...registroVacio(dia.fecha),
      rpe: 7,
      checks: { s0i0: true },
      series: {
        s1i0: [
          { kg: '40', reps: '8' },
          { kg: '42,5', reps: '8' },
          { kg: '42,5', reps: '7' },
        ],
        s1i1: [{ hecha: true }, { kg: '45', reps: '10' }],
        s1i2: [{ reps: '15' }, { reps: '12' }],
      },
      sustituciones: { s1i1: 'Remo con mancuerna' },
    };
    const r = resumenHistoria(dia, reg, 'Bastián');
    expect(r.titulo).toBe('Torso A · press banca y remo');
    expect(r.lineas).toEqual([
      { nombre: 'Press banca con barra', detalle: '42,5 kg × 8 · 3 series' },
      { nombre: 'Remo con mancuerna', detalle: '45 kg × 10 · 2 series' },
      { nombre: 'Flexiones', detalle: '2 series · hasta 15 reps' },
    ]);
    expect(r.series).toBe(7);
    expect(r.tonelaje).toBe(Math.round(40 * 8 + 42.5 * 8 + 42.5 * 7 + 450));
    expect(r.rpe).toBe(7);
    expect(hayQueCompartir(r)).toBe(true);
  });

  it('usa el entrenamiento libre (WOD) en un día sin planificación', () => {
    const reg = {
      ...registroVacio('2026-11-28'),
      libre: {
        tipo: 'Clase CrossFit',
        minutos: '60',
        ejercicios: [],
        wodArmado: {
          formato: 'AMRAP',
          minutos: '12',
          rondas: '5',
          repsExtra: '8',
          ejercicios: [{ nombre: 'Thrusters' }, { nombre: 'Pull-ups' }],
        },
      },
    };
    const r = resumenHistoria(undefined, reg, 'Kaazar');
    expect(r.titulo).toBe('Clase CrossFit');
    expect(r.lineas[0]).toEqual({ nombre: 'Thrusters · Pull-ups', detalle: 'AMRAP 12 min · 5 rondas + 8 reps' });
    expect(r.minutos).toBe(60);
  });

  it('no ofrece compartir si no se anotó nada', () => {
    expect(hayQueCompartir(resumenHistoria(dia, registroVacio(dia.fecha), 'Bastián'))).toBe(false);
  });
});
