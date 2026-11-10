import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import type { RegistroDia } from '../data/registro';
import { registroVacio } from '../data/registro';

import SesionLibre from './SesionLibre';

const visto = { ultimo: registroVacio('2026-11-07') };
function Envoltorio() {
  const [reg, setReg] = useState<RegistroDia>(registroVacio('2026-11-07'));
  return (
    <SesionLibre
      registro={reg}
      onCambiar={(c) =>
        setReg((r) => {
          const nuevo = { ...r, ...c };
          visto.ultimo = nuevo;
          return nuevo;
        })
      }
    />
  );
}

describe('SesionLibre', () => {
  it('arma una sesión: tipo, ejercicio con series (la nueva copia la anterior), WOD y esfuerzo', () => {
    render(<Envoltorio />);
    fireEvent.click(screen.getByText('＋ Registrar un entrenamiento'));
    fireEvent.click(screen.getByText('Clase CrossFit'));
    fireEvent.change(screen.getByLabelText('Nombre del ejercicio 1'), { target: { value: 'Back squat' } });
    fireEvent.change(screen.getByLabelText('Back squat serie 1 kg'), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Back squat serie 1 reps'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('＋ Serie'));
    expect((screen.getByLabelText('Back squat serie 2 kg') as HTMLInputElement).value).toBe('80');
    fireEvent.change(screen.getByPlaceholderText(/AMRAP/), { target: { value: 'Fran 6:30' } });
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    expect(visto.ultimo.rpe).toBe(7);
    expect(visto.ultimo.libre).toMatchObject({
      tipo: 'Clase CrossFit',
      wod: 'Fran 6:30',
      ejercicios: [
        {
          nombre: 'Back squat',
          series: [
            { kg: '80', reps: '5' },
            { kg: '80', reps: '5' },
          ],
        },
      ],
    });
  });

  it('borrar pide confirmación', () => {
    render(<Envoltorio />);
    fireEvent.click(screen.getByText('＋ Registrar un entrenamiento'));
    fireEvent.click(screen.getByText('Borrar entrenamiento'));
    fireEvent.click(screen.getByText('Sí, borrar'));
    expect(visto.ultimo.libre).toBeUndefined();
    expect(screen.getByText('＋ Registrar un entrenamiento')).toBeTruthy();
  });
});

it('en un día con plan se ofrece como entrenamiento extra', () => {
  render(<SesionLibre registro={registroVacio('2026-11-10')} onCambiar={() => undefined} conCierre extra />);
  expect(screen.getByText('＋ Registrar entrenamiento extra')).toBeTruthy();
});
