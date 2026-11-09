import { expect, test } from 'vitest';

import { guiaPendiente } from './correo';

test('guiaPendiente: nunca enviada o hace 30 días o más', () => {
  expect(guiaPendiente(undefined, '2026-11-09')).toBe(true);
  expect(guiaPendiente('2026-11-01T12:00:00Z', '2026-11-09')).toBe(false);
  expect(guiaPendiente('2026-10-10T12:00:00Z', '2026-11-09')).toBe(true);
  expect(guiaPendiente('2026-10-11T12:00:00Z', '2026-11-09')).toBe(false);
});
