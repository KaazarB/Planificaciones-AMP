import { describe, expect, it } from 'vitest';

import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';

import { calcularConstancia, lunesDeSemana, racha } from './cumplimiento';

const dia = (fecha: string, tipo: Dia['tipo'], titulo = 'Fuerza', semana = 1): Dia => ({
  fecha,
  dia: '',
  bloque: 1,
  semana,
  fase: 'Base',
  tipo,
  titulo,
  objetivo: '',
});

const reg = (fecha: string, extra: Partial<RegistroDia> = { rpe: 7 }): RegistroDia => ({
  fecha,
  checks: {},
  series: {},
  campos: {},
  actualizado: '2026-11-01T00:00:00Z',
  ...extra,
});
const libre = { tipo: 'Clase CrossFit', ejercicios: [] };

// Semana 1: lun 2 a dom 8 nov · semana 2: lun 9 a dom 15 nov · hoy: miércoles 11
const dias: Dia[] = [
  dia('2026-11-02', 'sesion'),
  dia('2026-11-04', 'sesion'),
  dia('2026-11-06', 'sesion'),
  dia('2026-11-09', 'sesion', 'Fuerza A', 2),
  dia('2026-11-10', 'descanso', 'Descanso', 2),
  dia('2026-11-11', 'sesion', 'Fuerza B', 2),
  dia('2026-11-12', 'clase', 'Clase en el box (opcional)', 2),
  dia('2026-11-13', 'sesion', 'Fuerza C', 2),
  dia('2026-11-15', 'descanso', 'Descanso', 2),
];
const registros: Record<string, RegistroDia> = {
  '2026-11-02': reg('2026-11-02'),
  '2026-11-06': reg('2026-11-06', { rpe: 8, libre }), // cumplido y además un extra
  '2026-11-09': reg('2026-11-09'),
  '2026-11-10': reg('2026-11-10', { libre }), // entrenó en su descanso
  '2026-11-13': reg('2026-11-13'), // anotado por adelantado: todavía no cuenta
};
const hoy = '2026-11-11';

describe('Cumplimiento del atleta', () => {
  it('marca cada día de la semana y calcula el % de la semana', () => {
    const c = calcularConstancia(dias, registros, hoy);
    expect(c.actual?.dias.map((d) => d.estado)).toEqual([
      'cumplido',
      'extra',
      'pendiente', // hoy, todavía sin registrar
      'opcional',
      'pendiente',
      'descanso',
      'descanso',
    ]);
    expect(c.actual).toMatchObject({
      cumplidos: 1,
      total: 3,
      pendientes: 2,
      sinRegistro: 0,
      porcentaje: 33,
      extras: 1,
    });
    expect(c.actual?.dias[2].hoy).toBe(true);
  });

  it('las semanas pasadas muestran lo que quedó sin registrar y los extras', () => {
    const [s1] = calcularConstancia(dias, registros, hoy).semanas;
    expect(s1.dias.filter((d) => d.estado !== 'descanso').map((d) => d.estado)).toEqual([
      'cumplido',
      'sin-registro',
      'cumplido',
    ]);
    expect(s1).toMatchObject({ cumplidos: 2, total: 3, sinRegistro: 1, porcentaje: 67, extras: 1 });
    expect(s1.dias[4].conExtra).toBe(true);
  });

  it('el total desde el inicio no castiga el día de hoy ni los opcionales', () => {
    const c = calcularConstancia(dias, registros, hoy);
    expect([c.cumplidos, c.vencidos, c.porcentaje]).toEqual([3, 4, 75]);
    expect(c.extras).toBe(2);
  });

  it('la racha cuenta entrenos cumplidos seguidos; hoy sin registrar no la corta', () => {
    expect(racha(dias, registros, hoy)).toBe(2); // 9 y 6 nov; el 4 quedó sin registrar
    expect(racha(dias, {}, hoy)).toBe(0);
  });

  it('antes de que parta el plan no hay semanas que mostrar', () => {
    const c = calcularConstancia([dia('2026-11-16', 'sesion')], {}, hoy);
    expect(c.semanas).toEqual([]);
    expect(c.actual).toBeNull();
    expect(c.porcentaje).toBeNull();
  });

  it('el lunes de la semana de cualquier día', () => {
    expect(lunesDeSemana('2026-11-15')).toBe('2026-11-09');
    expect(lunesDeSemana('2026-11-09')).toBe('2026-11-09');
    expect(lunesDeSemana('2026-11-11')).toBe('2026-11-09');
  });
});
