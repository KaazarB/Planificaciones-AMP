import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';
import { registroVacio } from '../data/registro';

import RegistroCierre from './RegistroCierre';

const dia: Dia = {
  fecha: '2026-11-10',
  dia: 'Martes 10',
  bloque: 1,
  semana: 2,
  fase: 'Progresión',
  tipo: 'sesion',
  titulo: 'Fuerza A',
  objetivo: 'Sentadilla',
};

function Envoltorio({ nube }: { nube: boolean }) {
  const [registro, setRegistro] = useState<RegistroDia>(registroVacio(dia.fecha));
  return (
    <RegistroCierre
      dia={dia}
      reglas={undefined}
      abierta
      registro={registro}
      onAlternar={() => undefined}
      onCambiar={(c) => setRegistro((r) => ({ ...r, ...c, actualizado: new Date(Date.now() + 1000).toISOString() }))}
      onRegistrar={async () => {
        const ahora = new Date().toISOString();
        setRegistro((r) => ({ ...r, cerrada: ahora, actualizado: ahora }));
        return nube;
      }}
    />
  );
}

describe('Registrar sesión', () => {
  it('confirma que la sesión quedó registrada y ofrece actualizar si se edita después', async () => {
    render(<Envoltorio nube />);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sesión' }));
    expect(await screen.findByText('¡Sesión registrada!')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox', { name: 'Notas y sensaciones' }), { target: { value: 'Bien' } });
    expect(screen.getByRole('button', { name: 'Actualizar registro' })).toBeTruthy();
  });

  it('avisa cuando quedó solo en el teléfono y permite reintentar', async () => {
    render(<Envoltorio nube={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sesión' }));
    expect(await screen.findByText('Guardada en tu teléfono')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar envío' })).toBeTruthy();
  });
});
