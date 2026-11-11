import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RegistroDia } from '../data/registro';
import { registroVacio } from '../data/registro';

import SesionLibre from './SesionLibre';

const visto = { ultimo: registroVacio('2026-11-11') };
function Envoltorio({ inicial }: { inicial?: RegistroDia }) {
  const [reg, setReg] = useState<RegistroDia>(inicial ?? registroVacio('2026-11-11'));
  return (
    <SesionLibre
      registro={reg}
      conCierre
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

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
const tocar = (nombre: string) => fireEvent.click(screen.getByRole('button', { name: nombre }));

function abrirArmado() {
  render(<Envoltorio />);
  tocar('＋ Registrar un entrenamiento');
  tocar('Clase CrossFit');
  tocar('＋ Armar WOD paso a paso');
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Armar el WOD paso a paso', () => {
  it('solo se ofrece si eligió Clase CrossFit', () => {
    render(<Envoltorio />);
    tocar('＋ Registrar un entrenamiento');
    expect(screen.queryByText('＋ Armar WOD paso a paso')).toBeNull();
    tocar('Fuerza');
    expect(screen.queryByText('＋ Armar WOD paso a paso')).toBeNull();
    tocar('Clase CrossFit');
    expect(screen.getByText('＋ Armar WOD paso a paso')).toBeTruthy();
    // Sigue pudiendo escribirlo a su manera
    expect(screen.getByLabelText('O escríbelo a tu manera')).toBeTruthy();
  });

  it('AMRAP: formato, tiempo, rondas, ejercicios y peso, y queda el resumen', () => {
    abrirArmado();
    expect(screen.getByText('Paso 1 de 5')).toBeTruthy();
    tocar('Siguiente');
    expect(screen.getByText('Elige el formato para seguir.')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /AMRAP/ }));
    tocar('Siguiente');
    expect(screen.getByText('¿De cuántos minutos era?')).toBeTruthy();
    escribir('Duración', '12');

    tocar('Siguiente');
    expect(screen.getByText('¿Cuántas rondas completaste?')).toBeTruthy();
    escribir('Rondas completas', '6');
    escribir('Reps extra', '4');

    tocar('Siguiente');
    escribir('Repeticiones del ejercicio 1', '10');
    escribir('Ejercicio 1 del WOD', 'Wall ball');
    tocar('＋ Agregar ejercicio al WOD');
    escribir('Repeticiones del ejercicio 2', '10');
    escribir('Ejercicio 2 del WOD', 'Burpee');
    tocar('＋ Agregar ejercicio al WOD'); // fila vacía: se quita al terminar

    tocar('Siguiente');
    expect(screen.getByText('¿Con cuánto peso?')).toBeTruthy();
    escribir('Peso de Wall ball', '9');
    tocar('Listo');

    const resumen = screen.getByRole('group', { name: 'WOD armado' });
    expect(within(resumen).getByText('AMRAP 12 min')).toBeTruthy();
    expect(within(resumen).getByText('Wall ball')).toBeTruthy();
    expect(within(resumen).getByText('9 kg')).toBeTruthy();
    expect(within(resumen).getByText('6 rondas + 4 reps')).toBeTruthy();
    expect(visto.ultimo.libre?.wodArmado).toEqual({
      formato: 'AMRAP',
      minutos: '12',
      rondas: '6',
      repsExtra: '4',
      ejercicios: [
        { nombre: 'Wall ball', reps: '10', kg: '9' },
        { nombre: 'Burpee', reps: '10' },
      ],
    });
  });

  it('For Time: el tiempo va en minutos y segundos; los pasos vacíos se pueden omitir', () => {
    abrirArmado();
    fireEvent.click(screen.getByRole('radio', { name: /For Time/ }));
    tocar('Siguiente');
    escribir('Minutos', '6');
    escribir('Segundos', '3');
    tocar('Siguiente');
    tocar('Omitir'); // rondas
    escribir('Repeticiones del ejercicio 1', '21-15-9');
    escribir('Ejercicio 1 del WOD', 'Thruster');
    tocar('Siguiente');
    tocar('Listo');
    const resumen = screen.getByRole('group', { name: 'WOD armado' });
    expect(within(resumen).getByText('Tiempo: 6:03')).toBeTruthy();
    expect(within(resumen).getByText('21-15-9')).toBeTruthy();
  });

  it('al elegir el formato pasa solo al paso siguiente', () => {
    vi.useFakeTimers();
    abrirArmado();
    fireEvent.click(screen.getByRole('radio', { name: /EMOM/ }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText('¿Cuántos minutos duró?')).toBeTruthy();
    expect(screen.getByText('Paso 2 de 5')).toBeTruthy();
  });

  it('cancelar un WOD nuevo lo descarta; editar uno guardado vuelve a los pasos', () => {
    abrirArmado();
    fireEvent.click(screen.getByRole('radio', { name: /AMRAP/ }));
    tocar('Cancelar');
    expect(visto.ultimo.libre?.wodArmado).toBeUndefined();
    expect(screen.getByText('＋ Armar WOD paso a paso')).toBeTruthy();

    tocar('＋ Armar WOD paso a paso');
    fireEvent.click(screen.getByRole('radio', { name: /EMOM/ }));
    tocar('Siguiente');
    escribir('Duración', '10');
    tocar('Peso'); // salto directo al último paso
    tocar('Listo');
    expect(screen.getByText('EMOM 10 min')).toBeTruthy();

    tocar('Editar WOD');
    expect(screen.getByRole('radio', { name: /EMOM/ })).toHaveAttribute('aria-checked', 'true');
    tocar('Cerrar');
    tocar('Quitar');
    tocar('Sí, quitar');
    expect(visto.ultimo.libre?.wodArmado).toBeUndefined();
  });

  it('el coach ve el WOD armado sin poder editarlo', () => {
    const reg: RegistroDia = {
      ...registroVacio('2026-11-11'),
      libre: {
        tipo: 'Clase CrossFit',
        ejercicios: [],
        wodArmado: {
          formato: 'For Time',
          rondas: '3',
          tiempo: '6:30',
          ejercicios: [{ nombre: 'Pull-up', reps: '10' }],
        },
      },
    };
    render(<SesionLibre registro={reg} onCambiar={() => undefined} conCierre soloLectura />);
    expect(screen.getByText('For Time · 3 rondas')).toBeTruthy();
    expect(screen.getByText('Tiempo: 6:30')).toBeTruthy();
    expect(screen.queryByText('Editar WOD')).toBeNull();
  });
});
