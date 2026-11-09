import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type * as ServicioCuenta from '../services/cuenta';
import type * as ServicioPlan from '../services/plan';
import type * as ServicioRevisiones from '../services/revisiones';

import Coach from './Coach';

// Datos simulados: un coach, un atleta activo y una atleta que envió su ficha y espera su plan
const datos = vi.hoisted(() => {
  const coach = {
    id: 'c1',
    nombre: 'Marcelo Balcazar',
    apodo: 'Marcelo',
    rol: 'coach',
    estado: 'activo',
    creado: '2026-11-01T20:00:00Z',
    whatsapp: '',
    correo: 'coach@ejemplo.cl',
  };
  return {
    coach,
    perfiles: [
      {
        id: 'a1',
        nombre: 'Matías Prueba',
        apodo: 'Mati',
        rol: 'atleta',
        estado: 'evaluacion',
        creado: '2026-11-05T15:00:00Z',
        whatsapp: '',
        correo: 'mati@ejemplo.cl',
      },
      {
        id: 'a2',
        nombre: 'Luis Activo',
        apodo: 'Luis',
        rol: 'atleta',
        estado: 'activo',
        creado: '2026-11-01T15:00:00Z',
        whatsapp: '',
        correo: 'luis@ejemplo.cl',
      },
      coach,
    ],
  };
});

vi.mock('../services/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: datos.perfiles, error: null }) }) }),
    rpc: vi.fn(async () => ({ error: null })),
  },
}));

vi.mock('../context/Cuenta', () => ({ useCuenta: () => ({ perfil: datos.coach }) }));

vi.mock('../services/cuenta', async (original) => ({
  ...(await original<typeof ServicioCuenta>()),
  fichasBreves: vi.fn(
    async () =>
      new Map([['a1', { actualizado: '2026-11-07T15:00:00Z', whatsapp: '9 1234 5678', inicio: '2026-11-16' }]]),
  ),
  leerFicha: vi.fn(async () => ({ whatsapp: '9 1234 5678', inicio: '2026-11-16' })),
}));

vi.mock('../services/plan', async (original) => ({
  ...(await original<typeof ServicioPlan>()),
  ultimosBloques: vi.fn(async () => new Map()),
  planesDe: vi.fn(async () => []),
}));

vi.mock('../services/revisiones', async (original) => ({
  ...(await original<typeof ServicioRevisiones>()),
  revisionesRespondidas: vi.fn(async () => new Set()),
  ultimaRevision: vi.fn(async () => null),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-09T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

const parametro = (href: string | null, nombre: string) => new URL(href ?? '').searchParams.get(nombre) ?? '';

test('«Esperando su plan» muestra el correo informativo por Gmail y el aviso por WhatsApp', async () => {
  render(<Coach />);

  const titulo = await screen.findByText('Esperando su plan · 1');
  const seccion = titulo.closest('section') as HTMLElement;
  expect(within(seccion).getByText('Matías Prueba')).toBeInTheDocument();
  expect(
    await within(seccion).findByText('Envió su ficha hace 2 días · quiere empezar el lunes 16 de noviembre'),
  ).toBeInTheDocument();
  expect(within(seccion).getByText('mati@ejemplo.cl')).toBeInTheDocument();

  const gmail = within(seccion).getByRole('link', { name: 'Informar por Gmail' });
  const href = gmail.getAttribute('href');
  expect(href).toMatch(/^https:\/\/mail\.google\.com\/mail\//);
  expect(parametro(href, 'to')).toBe('mati@ejemplo.cl');
  expect(parametro(href, 'su')).toBe('Recibí tu ficha: tu planificación está en camino');
  expect(parametro(href, 'body')).toMatch(/^¡Hola Mati! 👋 Recibí tu ficha/);
  expect(parametro(href, 'body')).toContain('la verás directo en la app: http://localhost:3000/');

  expect(within(seccion).getByRole('button', { name: 'Copiar correo' })).toBeInTheDocument();
  expect(within(seccion).getByRole('button', { name: 'Copiar mensaje' })).toBeInTheDocument();

  const whatsapp = within(seccion).getByRole('link', { name: 'Informar por WhatsApp' });
  expect(whatsapp.getAttribute('href')).toContain('phone=56912345678');
  expect(whatsapp.getAttribute('href')).toContain(encodeURIComponent('Recibí tu ficha'));

  // Ya no se repite en una lista aparte de «En evaluación»; los activos siguen en su grupo
  expect(screen.queryByText(/^En evaluación ·/)).not.toBeInTheDocument();
  expect(screen.getByText('Activo · 2')).toBeInTheDocument();
});

test('la ficha de quien espera su plan también trae el correo informativo', async () => {
  render(<Coach />);

  fireEvent.click(await screen.findByText('Matías Prueba'));

  expect(await screen.findByText('En evaluación')).toBeInTheDocument();
  const gmail = await screen.findByRole('link', { name: 'Informar por Gmail' });
  expect(parametro(gmail.getAttribute('href'), 'su')).toBe('Recibí tu ficha: tu planificación está en camino');
  expect(await screen.findByRole('link', { name: 'Informar por WhatsApp' })).toBeInTheDocument();
});
