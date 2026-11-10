import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { pantallasFicha } from '../data/ficha';

import FichaFormulario from './FichaFormulario';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

const abrir = (onEnviar = vi.fn(async () => {})) =>
  render(<FichaFormulario usuarioId="u1" textoEnviar="Enviar ficha" onEnviar={onEnviar} />);

test('muestra una pregunta por pantalla y no avanza si falta una obligatoria', () => {
  abrir();
  expect(screen.getByText('¿Qué deportes o actividades practicas?')).toBeInTheDocument();
  expect(screen.queryByText('Edad')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Esta pregunta es obligatoria.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Gimnasio' }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Edad')).toBeInTheDocument();
  expect(screen.queryByText('Peso')).not.toBeInTheDocument();
});

test('al elegir una opción pasa sola a la siguiente pregunta, y «Atrás» vuelve', () => {
  abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Gimnasio' }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

  expect(screen.getByText('Sexo')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Masculino' }));
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByText('Peso')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
  expect(screen.getByText('Sexo')).toBeInTheDocument();
});

test('las preguntas opcionales sin respuesta se pueden omitir', () => {
  abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Gimnasio' }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Omitir' }));
  expect(screen.getByText('Peso')).toBeInTheDocument();
});

test('las marcas de CrossFit siguen juntas en una sola pantalla', () => {
  const pantallas = pantallasFicha({ deporte: ['CrossFit'] });
  const marcas = pantallas.find((p) => p.paso.titulo === 'Tus marcas');
  expect(marcas?.campos.length).toBe(8);
  expect(pantallas.filter((p) => p.paso.titulo === 'Sobre ti')).toHaveLength(6);
});

test('modo «paso» (editar ficha) mantiene las secciones completas', () => {
  render(
    <FichaFormulario
      modo="paso"
      usuarioId="u1"
      inicial={{ deporte: ['Gimnasio'] }}
      textoEnviar="Guardar"
      onEnviar={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Edad')).toBeInTheDocument();
  expect(screen.getByText('Peso')).toBeInTheDocument();
});
