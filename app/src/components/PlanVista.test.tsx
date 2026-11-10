import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Plan } from '../data/plan';
import { aTextoISO } from '../domain/semanas';

import PlanVista from './PlanVista';

const hoy = aTextoISO(new Date());
const plan: Plan = {
  version_esquema: 1,
  atleta: { nombre: 'Test' },
  bloque: { numero: 1, inicio: hoy, fin: hoy, semanas: 1, total_dias: 1 },
  dias: [
    {
      fecha: hoy,
      dia: 'Hoy',
      bloque: 1,
      semana: 1,
      fase: 'Base',
      tipo: 'sesion',
      titulo: 'Fuerza A',
      objetivo: '',
      secciones: [{ titulo: 'Fuerza', check: false, nota: '', items: [{ nombre: 'Sentadilla', presc: '3 × 5' }] }],
    },
  ],
};

vi.mock('../services/plan', () => ({ cargarPlan: () => Promise.resolve(plan) }));
vi.mock('../services/videos', () => ({ leerVideos: () => Promise.resolve(new Map()) }));
vi.mock('../services/registros', () => ({
  leerLocales: () => ({}),
  sincronizar: () => Promise.resolve({ registros: {}, nube: false }),
  leerRegistrosNube: () => Promise.resolve({}),
  guardarLocal: () => undefined,
  subirRegistro: () => Promise.resolve(true),
}));
vi.mock('./RevisionBloque', () => ({ default: () => null }));

describe('PlanVista', () => {
  it('un día de sesión ofrece registrar un entrenamiento extra', async () => {
    render(<PlanVista atleta="x" apodo="Test" />);
    expect(await screen.findByText('Fuerza A')).toBeTruthy();
    expect(screen.getByText('＋ Registrar entrenamiento extra')).toBeTruthy();
  });
});
