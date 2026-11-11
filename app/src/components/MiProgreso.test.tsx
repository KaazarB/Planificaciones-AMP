import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';

import MiProgreso from './MiProgreso';

const dia = (fecha: string, tipo: Dia['tipo'], titulo: string, semana: number): Dia => ({
  fecha,
  dia: '',
  bloque: 1,
  semana,
  fase: 'Progresión',
  tipo,
  titulo,
  objetivo: '',
  secciones:
    tipo === 'sesion'
      ? [
          {
            titulo: 'Fuerza',
            check: false,
            nota: '',
            items: [{ nombre: 'Sentadilla con barra', presc: '', series: 2, campos: ['kg', 'reps'] }],
          },
        ]
      : [],
});

const reg = (fecha: string, extra: Partial<RegistroDia>): RegistroDia => ({
  fecha,
  checks: {},
  series: {},
  campos: {},
  actualizado: '2026-11-01T00:00:00Z',
  ...extra,
});

// Hoy: miércoles 11 de noviembre (semana 2)
const dias: Dia[] = [
  dia('2026-11-02', 'sesion', 'Fuerza A', 1),
  dia('2026-11-04', 'sesion', 'Fuerza B', 1),
  dia('2026-11-06', 'sesion', 'Fuerza C', 1),
  dia('2026-11-09', 'sesion', 'Fuerza A', 2),
  dia('2026-11-11', 'sesion', 'Fuerza B', 2),
  dia('2026-11-13', 'sesion', 'Fuerza C', 2),
];
const serie = (kg: string) => ({ s0i0: [{ kg, reps: '5' }] });
const registros = {
  '2026-11-02': reg('2026-11-02', { series: serie('60'), rpe: 7 }),
  '2026-11-06': reg('2026-11-06', { series: serie('62,5'), campos: { 'Peso en ayunas (kg)': '82' } }),
  '2026-11-09': reg('2026-11-09', { series: serie('65'), campos: { 'Peso en ayunas (kg)': '81' } }),
};

describe('Mi progreso', () => {
  it('muestra el % de la semana, los días cumplidos y el estado', () => {
    render(<MiProgreso dias={dias} registros={registros} ficha={null} hoy="2026-11-11" />);
    const semana = screen.getByRole('region', { name: 'Esta semana' });
    expect(within(semana).getByText('33%')).toBeTruthy();
    expect(within(semana).getByText('1 de 3 entrenamientos')).toBeTruthy();
    expect(within(semana).getByText('Vas al día · te quedan 2 entrenamientos')).toBeTruthy();
    expect(within(semana).getByLabelText('Lunes 9 · Fuerza A: cumplido')).toBeTruthy();
    expect(within(semana).getByLabelText('Miércoles 11 · Fuerza B: por hacer (hoy)')).toBeTruthy();
    expect(within(semana).getByRole('meter')).toHaveAttribute('aria-valuenow', '1');
  });

  it('muestra el total, la racha y cada semana con su cifra', () => {
    render(<MiProgreso dias={dias} registros={registros} ficha={null} hoy="2026-11-11" />);
    expect(screen.getByText('75%')).toBeTruthy(); // 3 de 4 desde el inicio (hoy no cuenta todavía)
    expect(screen.getByText('3 de 4 desde el inicio')).toBeTruthy();
    const semanas = screen.getByRole('region', { name: 'Cumplimiento semana a semana' });
    expect(within(semanas).getByText('Esta semana')).toBeTruthy();
    expect(within(semanas).getByText('Semana 1')).toBeTruthy();
    expect(within(semanas).getByText('67%')).toBeTruthy();
  });

  it('muestra cómo suben las cargas y las mediciones, con el objetivo de la ficha', () => {
    render(
      <MiProgreso
        dias={dias}
        registros={registros}
        ficha={{ objetivo: 'Bajar de peso', tiene_evento: 'No' }}
        hoy="2026-11-11"
      />,
    );
    expect(screen.getByText('Bajar de peso')).toBeTruthy();
    const cargas = screen.getByRole('region', { name: 'Tus cargas' });
    expect(within(cargas).getByText('Sentadilla con barra')).toBeTruthy();
    expect(within(cargas).getByText('65 kg')).toBeTruthy();
    expect(within(cargas).getByText('+5 kg')).toBeTruthy();
    const mediciones = screen.getByRole('region', { name: 'Tus mediciones' });
    expect(within(mediciones).getByText('81 kg')).toBeTruthy();
    expect(within(mediciones).getByText('−1 kg')).toHaveClass('sube'); // quiere bajar de peso: va bien
  });

  it('sin registros todavía, explica qué va a aparecer', () => {
    render(<MiProgreso dias={dias} registros={{}} ficha={null} hoy="2026-11-11" />);
    expect(screen.getByText(/Aquí vas a ver cómo avanzas/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Tus cargas' })).toBeNull();
  });

  it('si el plan parte más adelante, lo dice', () => {
    render(
      <MiProgreso dias={[dia('2026-11-16', 'sesion', 'Fuerza A', 1)]} registros={{}} ficha={null} hoy="2026-11-11" />,
    );
    expect(screen.getByText(/Tu plan parte el lunes 16 de noviembre/)).toBeTruthy();
  });
});
