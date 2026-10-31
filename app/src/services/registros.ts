// Capa de servicios: guarda y lee los registros
// Por ahora en el navegador; más adelante, en una base de datos en internet

import type { Registro } from '../data/registro';

const CLAVE = 'amp-registros';

export function leerRegistros(): Record<string, Registro> {
  try {
    const texto = localStorage.getItem(CLAVE);
    return texto ? JSON.parse(texto) : {};
  } catch {
    return {};
  }
}

export function guardarRegistro(registro: Registro): void {
  const todos = leerRegistros();
  todos[registro.sesionId] = registro;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(todos));
  } catch {
    // Si el navegador no permite guardar, no hacemos nada por ahora
  }
}
