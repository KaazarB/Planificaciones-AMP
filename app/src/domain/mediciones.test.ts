import { describe, expect, it } from 'vitest';

import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';

import {
  conObjetivo,
  medicionesDeCampos,
  metaDeFicha,
  nombreLimpio,
  segundosDe,
  testsEnSegundos,
  tipoDeCampo,
  tituloSeccion,
  valorNumerico,
  wodsConResultado,
} from './mediciones';

const reg = (fecha: string, extra: Partial<RegistroDia>): RegistroDia => ({
  fecha,
  checks: {},
  series: {},
  campos: {},
  actualizado: '2026-11-01T00:00:00Z',
  ...extra,
});

describe('Mediciones de progreso', () => {
  it('reconoce qué campos de registro son mediciones (y deja fuera molestias y sensaciones)', () => {
    expect(tipoDeCampo('Distancia (km)')).toMatchObject({ unidad: 'km', agregar: 'suma', mejor: 'sube' });
    expect(tipoDeCampo('Ritmo medio (min/km)')).toMatchObject({ formato: 'tiempo', mejor: 'baja' });
    expect(tipoDeCampo('Pasos del día (si tienes el dato)')).toMatchObject({ unidad: 'pasos', agregar: 'promedio' });
    expect(tipoDeCampo('Peso corporal en ayunas (kg, opcional)')).toMatchObject({ unidad: 'kg', mejor: null });
    expect(tipoDeCampo('FC media (si tienes reloj)')).toMatchObject({ unidad: 'lpm' });
    for (const fuera of [
      'Tobillo al terminar (0-10)',
      'RPE de la sesión (1-10)',
      'Minutos o km',
      'Tiempo total',
      'Horas de sueño anoche',
      'Fútbol: minutos jugados (o «no jugué»)',
    ])
      expect(tipoDeCampo(fuera)).toBeNull();
  });

  it('lee números y tiempos como los escribe la gente', () => {
    expect(nombreLimpio('Peso en la mañana, opcional (kg)')).toBe('Peso en la mañana');
    expect(nombreLimpio('Distancia (km, si la tienes)')).toBe('Distancia');
    expect(valorNumerico('8.500', true)).toBe(8500);
    expect(valorNumerico('8,5 km')).toBe(8.5);
    expect(valorNumerico('no jugué')).toBeNull();
    expect(segundosDe('6:30', 'min')).toBe(390);
    expect(segundosDe('1:02:15', 'min')).toBe(3735);
    expect(segundosDe('6,5', 'min')).toBe(390);
    expect(segundosDe('95', 'seg')).toBe(95);
  });

  it('arma la evolución: el volumen por semana y las marcas por registro', () => {
    const registros = {
      '2026-11-03': reg('2026-11-03', {
        campos: { 'Distancia (km)': '5', 'Ritmo medio (min/km)': '6:30', 'Tobillo al terminar (0-10)': '3' },
      }),
      '2026-11-05': reg('2026-11-05', { campos: { 'Distancia (km, si la tienes)': '8', 'Peso en ayunas (kg)': '82' } }),
      '2026-11-10': reg('2026-11-10', {
        campos: { 'Distancia (km)': '10', 'Ritmo medio (min/km)': '6:10', 'Peso en ayunas (kg)': '81,5' },
      }),
      '2026-11-20': reg('2026-11-20', { campos: { 'Distancia (km)': '12' } }), // en el futuro: no cuenta
    };
    const ms = medicionesDeCampos(registros, '2026-11-11');
    expect(ms.map((m) => m.nombre).sort()).toEqual(['Distancia', 'Peso en ayunas', 'Ritmo medio']);
    const distancia = ms.find((m) => m.nombre === 'Distancia')!;
    expect(distancia.porSemana).toBe(true);
    expect(distancia.puntos).toEqual([
      { fecha: '2026-11-02', valor: 13 },
      { fecha: '2026-11-09', valor: 10 },
    ]);
    expect(ms.find((m) => m.nombre === 'Ritmo medio')?.puntos.map((p) => p.valor)).toEqual([390, 370]);

    // Con «Bajar de peso» en la ficha, que el peso baje es progreso
    const peso = conObjetivo(ms, { objetivos: ['Bajar de peso'], evento: null, peso: 'baja' }).find(
      (m) => m.unidad === 'kg',
    );
    expect(peso).toMatchObject({ mejor: 'baja', puntos: [{ valor: 82 }, { valor: 81.5 }] });
  });

  it('los tests en segundos comparan test y retest', () => {
    const test = (fecha: string): Dia => ({
      fecha,
      dia: '',
      bloque: 1,
      semana: 1,
      fase: '',
      tipo: 'sesion',
      titulo: 'Cardio + core · test',
      objetivo: '',
      secciones: [
        {
          titulo: 'Core',
          check: false,
          nota: '',
          items: [{ nombre: 'Plancha lateral', presc: '', series: 2, campos: ['seg'] }],
        },
        {
          titulo: 'Test · remo 500 m',
          check: false,
          nota: '',
          items: [
            { nombre: 'Plancha en antebrazos (máximo)', presc: '', series: 2, campos: ['seg'] },
            { nombre: 'Remo 500 m', presc: '', series: 1, campos: ['seg'] },
          ],
        },
      ],
    });
    const dias = [test('2026-11-02'), test('2026-11-09')];
    const registros = {
      '2026-11-02': reg('2026-11-02', {
        series: { s0i0: [{ seg: '30' }], s1i0: [{ seg: '60' }, { seg: '75' }], s1i1: [{ seg: '125' }] },
      }),
      '2026-11-09': reg('2026-11-09', { series: { s1i0: [{ seg: '80' }], s1i1: [{ seg: '1:58' }] } }),
    };
    const ts = testsEnSegundos(dias, registros, '2026-11-11');
    expect(ts.map((t) => t.nombre)).toEqual(['Plancha en antebrazos (máximo)', 'Remo 500 m']); // la plancha del core no es test
    expect(ts[0]).toMatchObject({ mejor: 'sube', puntos: [{ valor: 75 }, { valor: 80 }] });
    expect(ts[1]).toMatchObject({ mejor: 'baja', puntos: [{ valor: 125 }, { valor: 118 }] });
  });

  it('junta los WODs con resultado: los armados paso a paso y los del plan', () => {
    const dias: Dia[] = [
      {
        fecha: '2026-11-04',
        dia: '',
        bloque: 1,
        semana: 1,
        fase: '',
        tipo: 'sesion',
        titulo: 'Clean & jerk · técnico + línea base',
        objetivo: '',
        registro: ['WOD: tiempo o rondas + reps'],
        secciones: [{ titulo: '03 · WOD · CLEAN SCALED · FOR TIME', check: true, nota: '', items: [] }],
      },
    ];
    const registros = {
      '2026-11-04': reg('2026-11-04', { campos: { 'WOD: tiempo o rondas + reps': '6:12' } }),
      '2026-11-10': reg('2026-11-10', {
        libre: {
          tipo: 'Clase CrossFit',
          ejercicios: [],
          wodArmado: { formato: 'AMRAP', minutos: '12', rondas: '6', repsExtra: '4', ejercicios: [] },
        },
      }),
    };
    expect(wodsConResultado(dias, registros, '2026-11-11')).toEqual([
      { fecha: '2026-11-10', titulo: 'AMRAP 12 min', resultado: '6 rondas + 4 reps' },
      { fecha: '2026-11-04', titulo: 'Clean scaled · For Time', resultado: '6:12' },
    ]);
  });
});

describe('Títulos de los WODs del plan', () => {
  it('quita la numeración y el «WOD» repetido, y deja las siglas como se usan', () => {
    expect(tituloSeccion('02 · WOD · AMRAP 12 MIN')).toBe('AMRAP 12 min');
    expect(tituloSeccion('Benchmark · AMRAP 12 MIN')).toBe('Benchmark · AMRAP 12 min');
    expect(tituloSeccion('03 · WOD · CLEAN SCALED · FOR TIME · 4 RONDAS')).toBe('Clean scaled · For Time · 4 rondas');
  });
});

describe('Meta desde la ficha', () => {
  it('objetivo, evento con cuenta regresiva y hacia dónde va el peso', () => {
    const m = metaDeFicha(
      {
        objetivo: 'Bajar de peso',
        tiene_evento: 'Sí',
        evento: 'Maratón de Santiago',
        fecha_evento: '2027-04-11',
        meta_evento: 'Mejorar mi marca',
        marca_evento: 'bajar de 4 horas',
      },
      '2026-11-11',
    );
    expect(m.objetivos).toEqual(['Bajar de peso']);
    expect(m.evento).toEqual({
      nombre: 'Maratón de Santiago',
      fecha: '2027-04-11',
      faltan: 151,
      meta: 'bajar de 4 horas',
    });
    expect(m.peso).toBe('baja');
  });

  it('un evento que ya pasó no se muestra; CrossFit y deporte suman sus objetivos', () => {
    const m = metaDeFicha(
      {
        tiene_evento: 'Sí',
        evento: 'Open',
        fecha_evento: '2026-03-01',
        objetivo_cf: 'Mejorar mi nivel',
        mejorar: ['Fuerza'],
      },
      '2026-11-11',
    );
    expect(m.evento).toBeNull();
    expect(m.objetivos).toEqual(['CrossFit: mejorar mi nivel', 'Fuerza']);
    expect(m.peso).toBeNull();
    expect(metaDeFicha(null, '2026-11-11')).toEqual({ objetivos: [], evento: null, peso: null });
  });
});
