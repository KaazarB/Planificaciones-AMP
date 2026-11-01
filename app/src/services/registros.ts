// Capa de servicios: guarda los registros en el teléfono y, si existe la tabla,
// los sincroniza con Supabase (tabla registros_dia, ver supabase/registros_dia.sql).

import type { RegistroDia } from '../data/registro';

import { supabase } from './supabase';

type Mapa = Record<string, RegistroDia>;

const claveLocal = (atleta: string) => `amp.registros.${atleta}`;

function leerLocal(atleta: string): Mapa {
  try {
    return JSON.parse(localStorage.getItem(claveLocal(atleta)) || '{}') as Mapa;
  } catch {
    return {};
  }
}

function escribirLocal(atleta: string, mapa: Mapa) {
  try {
    localStorage.setItem(claveLocal(atleta), JSON.stringify(mapa));
  } catch {
    /* sin almacenamiento: queda solo en memoria */
  }
}

export function leerLocales(atleta: string): Mapa {
  return leerLocal(atleta);
}

// Mezcla lo que haya en Supabase con lo local (gana el más reciente)
export async function sincronizar(atleta: string): Promise<{ registros: Mapa; nube: boolean }> {
  const mapa = leerLocal(atleta);
  try {
    const { data, error } = await supabase.from('registros_dia').select('fecha, datos').eq('atleta', atleta);
    if (error) throw error;
    for (const fila of (data ?? []) as { fecha: string; datos: RegistroDia }[]) {
      const local = mapa[fila.fecha];
      if (!local || local.actualizado < fila.datos.actualizado) mapa[fila.fecha] = fila.datos;
    }
    escribirLocal(atleta, mapa);
    return { registros: mapa, nube: true };
  } catch {
    return { registros: mapa, nube: false };
  }
}

export function guardarLocal(atleta: string, registro: RegistroDia): void {
  const mapa = leerLocal(atleta);
  mapa[registro.fecha] = registro;
  escribirLocal(atleta, mapa);
}

export async function subirRegistro(atleta: string, registro: RegistroDia): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('registros_dia')
      .upsert({ atleta, fecha: registro.fecha, datos: registro, actualizado: registro.actualizado });
    return !error;
  } catch {
    return false;
  }
}
