import { expect, test } from 'vitest';

import { podar } from './conservar-versiones';

const v = (n: number) => ({ fecha: `2026-11-${10 + n}`, archivos: [`assets/index-${n}.js`, 'assets/p-comun.js'] });

test('conserva los archivos de las últimas 5 versiones y borra los más antiguos', () => {
  const historial = [1, 2, 3, 4, 5].map(v);
  const enCarpeta = [1, 2, 3, 4, 5, 6]
    .map((n) => `assets/index-${n}.js`)
    .concat('assets/p-comun.js', 'assets/huerfano.js');
  const { versiones, borrar } = podar(historial, v(6), enCarpeta);
  expect(versiones.map((x) => x.fecha)).toEqual([2, 3, 4, 5, 6].map((n) => `2026-11-${10 + n}`));
  expect(borrar.sort()).toEqual(['assets/huerfano.js', 'assets/index-1.js']);
});

test('sin historial no borra nada de la versión nueva', () => {
  const { borrar } = podar([], v(1), ['assets/index-1.js', 'assets/p-comun.js']);
  expect(borrar).toEqual([]);
});
