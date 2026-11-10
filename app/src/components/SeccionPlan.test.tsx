import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import type { Seccion } from '../data/plan';
import type { RegistroDia } from '../data/registro';
import { registroVacio } from '../data/registro';
import { progresoSeccion } from '../domain/progreso';

import SeccionPlan from './SeccionPlan';

const seccion: Seccion = {
  titulo: 'Fuerza',
  check: false,
  nota: '',
  items: [
    {
      nombre: 'Sentadilla',
      presc: '2 series de 8 reps · 60 kg',
      series: 2,
      campos: ['kg', 'reps'],
      obj: '8',
      kg: '60',
    },
    { nombre: 'WOD Fran', presc: '21-15-9' },
  ],
};

const visto = { ultimo: registroVacio('2026-11-09') };
function Envoltorio() {
  const [reg, setReg] = useState<RegistroDia>(registroVacio('2026-11-09'));
  return (
    <SeccionPlan
      seccion={seccion}
      indice={0}
      abierta
      registro={reg}
      onAlternar={() => undefined}
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

describe('SeccionPlan: marcar como hecho', () => {
  it('el ✓ de una serie rellena peso y reps sugeridos, que siguen editables', () => {
    render(<Envoltorio />);
    fireEvent.click(screen.getByLabelText('Serie 1 de Sentadilla hecha'));
    const kg = screen.getByLabelText('Sentadilla serie 1 kg') as HTMLInputElement;
    expect(kg.value).toBe('60');
    expect((screen.getByLabelText('Sentadilla serie 1 reps') as HTMLInputElement).value).toBe('8');
    fireEvent.change(kg, { target: { value: '65' } });
    expect(visto.ultimo.series.s0i0[0]).toMatchObject({ hecha: true, kg: '65', reps: '8' });
    // Desmarcar quita lo rellenado automáticamente pero respeta el peso cambiado
    fireEvent.click(screen.getByLabelText('Serie 1 de Sentadilla hecha'));
    expect(visto.ultimo.series.s0i0[0]).toEqual({ hecha: false, kg: '65' });
  });

  it('los ítems sueltos (WOD) se pueden marcar y suman al progreso', () => {
    visto.ultimo = registroVacio('2026-11-09');
    render(<Envoltorio />);
    expect(progresoSeccion(seccion, 0, visto.ultimo)).toEqual([0, 3]);
    fireEvent.click(screen.getByRole('checkbox', { name: /WOD Fran/ }));
    fireEvent.click(screen.getByLabelText('Serie 2 de Sentadilla hecha'));
    expect(progresoSeccion(seccion, 0, visto.ultimo)).toEqual([2, 3]);
  });
});
