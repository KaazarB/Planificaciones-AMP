import { expect, test } from 'vitest';

import { fechaDeMarca, haceDias, sumarDias } from './fechas';

test('haceDias: hoy, ayer o hace N días', () => {
  expect(haceDias(-1)).toBe('hoy');
  expect(haceDias(0)).toBe('hoy');
  expect(haceDias(1)).toBe('ayer');
  expect(haceDias(5)).toBe('hace 5 días');
});

test('fechaDeMarca: fecha local AAAA-MM-DD de una marca de Supabase', () => {
  // A mediodía UTC la fecha es la misma en cualquier zona de América o Europa
  expect(fechaDeMarca('2026-11-07T12:00:00+00:00')).toBe('2026-11-07');
  expect(fechaDeMarca('2026-11-07 12:00:00.123+00')).toBe('2026-11-07');
  // Si no se puede leer, usa los primeros 10 caracteres
  expect(fechaDeMarca('2026-11-07 ??')).toBe('2026-11-07');
});

test('sumarDias', () => {
  expect(sumarDias('2026-11-09', 30)).toBe('2026-12-09');
  expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
});
