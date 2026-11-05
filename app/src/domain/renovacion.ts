// Capa de lógica: qué atletas necesitan su próximo bloque cargado

import { diaSiguiente, diasEntre, lunesDeISO } from './fechas';

export const DIAS_AVISO = 14; // se avisa cuando faltan 14 días o menos
export const DIAS_URGENTE = 7;

export interface UltimoBloque {
  bloque: number;
  fin: string; // AAAA-MM-DD
}

export interface Alerta {
  atletaId: string;
  bloque: number | null; // null = no tiene planes
  fin: string | null;
  dias: number | null; // días que faltan para el fin (negativo = ya terminó)
  urgente: boolean;
  proximoInicio: string; // lunes en que debería partir el próximo bloque
}

export function alertaDe(atletaId: string, ultimo: UltimoBloque | undefined, hoy: string): Alerta | null {
  if (!ultimo) return { atletaId, bloque: null, fin: null, dias: null, urgente: true, proximoInicio: lunesDeISO(hoy) };
  const dias = diasEntre(hoy, ultimo.fin);
  if (dias > DIAS_AVISO) return null;
  const desde = dias < 0 ? hoy : diaSiguiente(ultimo.fin);
  return { atletaId, ...ultimo, dias, urgente: dias <= DIAS_URGENTE, proximoInicio: lunesDeISO(desde) };
}

// Solo atletas activos; los más urgentes primero
export function alertasRenovacion(
  atletas: { id: string; estado: string }[],
  ultimos: Map<string, UltimoBloque>,
  hoy: string,
): Alerta[] {
  return atletas
    .filter((a) => a.estado === 'activo')
    .map((a) => alertaDe(a.id, ultimos.get(a.id), hoy))
    .filter((x): x is Alerta => x !== null)
    .sort((x, y) => (x.dias ?? -999) - (y.dias ?? -999));
}

export function textoAlerta(a: Alerta, fechaLarga: (iso: string) => string): string {
  if (a.bloque === null || a.fin === null || a.dias === null) return 'No tiene plan cargado';
  if (a.dias < 0) return `Su Bloque ${a.bloque} terminó el ${fechaLarga(a.fin)}`;
  if (a.dias === 0) return `Su Bloque ${a.bloque} termina hoy`;
  return `Bloque ${a.bloque} termina el ${fechaLarga(a.fin)} · faltan ${a.dias} ${a.dias === 1 ? 'día' : 'días'}`;
}
