import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Dia, Plan } from '../data/plan';
import { aTextoISO } from '../domain/semanas';

import PlanVista from './PlanVista';

const hoy = aTextoISO(new Date());
const diaDeHoy = (d: Partial<Dia>): Dia => ({
  fecha: hoy,
  dia: 'Hoy',
  bloque: 1,
  semana: 1,
  fase: 'Base',
  tipo: 'sesion',
  titulo: 'Fuerza A',
  objetivo: '',
  ...d,
});
const conDia = (d: Dia): Plan => ({
  version_esquema: 1,
  atleta: { nombre: 'Test' },
  bloque: { numero: 1, inicio: hoy, fin: hoy, semanas: 1, total_dias: 1 },
  dias: [d],
});

let plan: Plan = conDia(
  diaDeHoy({
    secciones: [{ titulo: 'Fuerza', check: false, nota: '', items: [{ nombre: 'Sentadilla', presc: '3 × 5' }] }],
  }),
);

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

const antes = (a: HTMLElement, b: HTMLElement) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('PlanVista', () => {
  it('un día con entrenamiento cargado: el extra va después del registro al terminar', async () => {
    render(<PlanVista atleta="x" apodo="Test" />);
    expect(await screen.findByText('Fuerza A')).toBeTruthy();
    const extra = screen.getByText('＋ Registrar entrenamiento extra');
    expect(antes(screen.getByText('Registro al terminar'), extra)).toBe(true);
  });

  it('un día sin entrenamiento cargado: primero el entrenamiento y después el registro al terminar', async () => {
    plan = conDia(diaDeHoy({ tipo: 'descanso', titulo: 'Fin de semana libre' }));
    render(<PlanVista atleta="x" apodo="Test" />);
    expect(await screen.findByText('Fin de semana libre')).toBeTruthy();
    const registrar = screen.getByRole('button', { name: '＋ Registrar un entrenamiento' });
    expect(antes(registrar, screen.getByText('Registro al terminar'))).toBe(true);

    // Al empezar a anotar se abre también el cierre, y en un descanso con entrenamiento se pide el esfuerzo
    fireEvent.click(registrar);
    expect(screen.getByRole('group', { name: 'RPE' })).toBeTruthy();
    expect(antes(screen.getByText('Entrenamiento libre'), screen.getByText('Registro al terminar'))).toBe(true);
  });

  it('una clase sin contenido cargado se anota arriba y no se pide de nuevo en el cierre', async () => {
    plan = conDia(diaDeHoy({ tipo: 'clase', titulo: 'Clase en el box (opcional)' }));
    render(<PlanVista atleta="x" apodo="Test" />);
    expect(await screen.findByText('Clase en el box (opcional)')).toBeTruthy();
    expect(screen.getByText('¿Entrenaste hoy? Anota lo que hiciste.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '＋ Registrar un entrenamiento' }));
    expect(antes(screen.getByText('Entrenamiento extra'), screen.getByText('Registro al terminar'))).toBe(true);
    expect(screen.queryByText('Qué hiciste en clase')).toBeNull();
  });

  it('una carrera sin secciones mantiene el registro primero (ahí se anota la carrera)', async () => {
    plan = conDia(diaDeHoy({ tipo: 'carrera', titulo: 'Carrera Z2', registro: ['Distancia (km)'] }));
    render(<PlanVista atleta="x" apodo="Test" />);
    expect(await screen.findByText('Carrera Z2')).toBeTruthy();
    const extra = screen.getByText('＋ Registrar entrenamiento extra');
    expect(antes(screen.getByText('Registro al terminar'), extra)).toBe(true);
  });
});
