import { expect, test } from 'vitest';

import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';

import { calcularResumen } from './metricas';

const dia = (fecha: string, tipo: Dia['tipo'], semana = 1): Dia => ({
  fecha,
  dia: '',
  bloque: 1,
  semana,
  fase: 'Base',
  tipo,
  titulo: 'x',
  objetivo: '',
  secciones:
    tipo === 'sesion'
      ? [
          {
            titulo: 'Fuerza',
            check: false,
            nota: '',
            items: [{ nombre: 'Sentadilla', presc: '', series: 3, campos: ['kg', 'reps'] }],
          },
        ]
      : [],
});

const reg = (fecha: string, extra: Partial<RegistroDia>): RegistroDia => ({
  fecha,
  checks: {},
  series: {},
  campos: {},
  actualizado: '2026-01-01T00:00:00Z',
  ...extra,
});

// Semana 1: lun 2 a dom 8 nov · semana 2: lun 9 a dom 15 nov
const dias: Dia[] = [
  dia('2026-11-02', 'sesion'),
  dia('2026-11-03', 'clase'),
  dia('2026-11-04', 'sesion'),
  dia('2026-11-05', 'descanso'),
  dia('2026-11-09', 'sesion', 2),
  dia('2026-11-11', 'sesion', 2),
  dia('2026-11-13', 'sesion', 2),
];

const registros = {
  '2026-11-02': reg('2026-11-02', {
    rpe: 7,
    series: {
      s0i0: [
        { kg: '60', reps: '5' },
        { kg: '62,5', reps: '5' },
      ],
    },
  }),
  '2026-11-03': reg('2026-11-03', { clase: 'Arranque' }),
  '2026-11-09': reg('2026-11-09', { rpe: 8, lumbarDespues: 7, series: { s0i0: [{ kg: '65', reps: '5' }] } }),
};

test('cumplimiento, tonelaje y progreso por semana', () => {
  const r = calcularResumen(dias, registros, '2026-11-11');
  expect(r.semanas).toHaveLength(2);
  const [s1, s2] = r.semanas;
  expect([s1.hechos, s1.planificados]).toEqual([2, 3]); // el descanso no cuenta
  expect(s1.tonelaje).toBe(60 * 5 + 62.5 * 5);
  expect([s1.seriesHechas, s1.seriesPlan]).toEqual([2, 6]);
  // Hoy (miércoles 11) cuenta recién cuando lo registre; el viernes 13 aún no vence
  expect([s2.hechos, s2.planificados, s2.totalSemana]).toEqual([1, 1, 3]);
  expect(r.actual?.lunes).toBe('2026-11-09');
  expect(r.adherencia).toBe(75); // 3 de 4
  expect(r.ejercicios[0]).toMatchObject({ nombre: 'Sentadilla', inicial: 62.5, mejor: 65 });
  expect(r.alertas.some((a) => a.gravedad === 'critica' && a.texto.includes('7/10'))).toBe(true);
  expect(r.diasSinRegistro).toBe(2);
});

test('avisa cuando hay entrenamientos seguidos sin registrar', () => {
  const r = calcularResumen(dias, {}, '2026-11-13');
  expect(r.ultimoRegistro).toBeNull();
  // El de hoy (viernes 13) todavía puede registrarlo: no suma al aviso
  expect(r.alertas.map((a) => a.texto)).toContain('4 entrenamientos seguidos sin registrar');
});

test('los días «(opcional)» no bajan el cumplimiento y, si los hace, suman aparte', () => {
  const opcional = (fecha: string): Dia => ({ ...dia(fecha, 'clase'), titulo: 'Clase en el box (opcional)' });
  const conOpcionales = [...dias, opcional('2026-11-06'), opcional('2026-11-07')];
  const r = calcularResumen(
    conOpcionales,
    {
      ...registros,
      '2026-11-06': reg('2026-11-06', { clase: 'WOD' }), // anotada en el plan
      '2026-11-07': reg('2026-11-07', { libre: { tipo: 'Clase CrossFit', ejercicios: [] } }), // anotada como libre
    },
    '2026-11-11',
  );
  const s1 = r.semanas[0];
  expect([s1.hechos, s1.planificados, s1.totalSemana]).toEqual([2, 3, 3]);
  expect(s1.opcionales).toBe(1);
  expect(s1.libres).toBe(1);
});

test('un entrenamiento libre suma a la semana, al tonelaje, al RPE y a la progresión del ejercicio', () => {
  const libre = reg('2026-11-07', {
    rpe: 8,
    libre: {
      tipo: 'Fuerza',
      ejercicios: [
        {
          nombre: 'Peso muerto',
          series: [
            { kg: '100', reps: '5' },
            { kg: '110', reps: '3' },
          ],
        },
      ],
    },
  });
  const r = calcularResumen(dias, { '2026-11-07': libre }, '2026-11-10');
  const s1 = r.semanas.find((s) => s.lunes === '2026-11-02')!;
  expect(s1.libres).toBe(1);
  expect(s1.tonelaje).toBe(100 * 5 + 110 * 3);
  expect(s1.rpe).toBe(8);
  expect(s1.hechos).toBe(0); // no cuenta como día planificado cumplido
  expect(r.ejercicios.find((e) => e.nombre === 'Peso muerto')?.mejor).toBe(110);
  expect(r.ultimoRegistro).toBe('2026-11-07');
});

test('una sesión libre recién abierta y vacía no cuenta como registro', () => {
  const vacia = reg('2026-11-07', { libre: { tipo: '', ejercicios: [{ nombre: '', series: [{}] }] } });
  const r = calcularResumen(dias, { '2026-11-07': vacia }, '2026-11-10');
  expect(r.ultimoRegistro).toBeNull();
});
