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
  expect([s2.hechos, s2.planificados, s2.totalSemana]).toEqual([1, 2, 3]); // el viernes 13 aún no vence
  expect(r.actual?.lunes).toBe('2026-11-09');
  expect(r.adherencia).toBe(60); // 3 de 5
  expect(r.ejercicios[0]).toMatchObject({ nombre: 'Sentadilla', inicial: 62.5, mejor: 65 });
  expect(r.alertas.some((a) => a.gravedad === 'critica' && a.texto.includes('7/10'))).toBe(true);
  expect(r.diasSinRegistro).toBe(2);
});

test('avisa cuando hay entrenamientos seguidos sin registrar', () => {
  const r = calcularResumen(dias, {}, '2026-11-13');
  expect(r.ultimoRegistro).toBeNull();
  expect(r.alertas.map((a) => a.texto)).toContain('5 entrenamientos seguidos sin registrar');
});
