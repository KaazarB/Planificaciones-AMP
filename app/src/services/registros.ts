// Capa de servicios: guarda y lee los registros en Supabase

import type { Registro, Sensacion } from '../data/registro';
import { supabase } from './supabase';

interface FilaRegistro {
  sesion_id: string;
  resultado: string;
  rpe: number;
  sensacion: string;
  comentario: string;
  fecha: string;
}

export async function leerRegistros(): Promise<Record<string, Registro>> {
  const { data, error } = await supabase.from('registros').select('*');
  if (error) throw error;

  const registros: Record<string, Registro> = {};
  for (const fila of (data ?? []) as FilaRegistro[]) {
    registros[fila.sesion_id] = {
      sesionId: fila.sesion_id,
      resultado: fila.resultado,
      rpe: fila.rpe,
      sensacion: fila.sensacion as Sensacion,
      comentario: fila.comentario,
      fecha: fila.fecha,
    };
  }
  return registros;
}

export async function guardarRegistro(registro: Registro): Promise<void> {
  const { error } = await supabase.from('registros').upsert({
    sesion_id: registro.sesionId,
    resultado: registro.resultado,
    rpe: registro.rpe,
    sensacion: registro.sensacion,
    comentario: registro.comentario,
    fecha: registro.fecha,
  });
  if (error) throw error;
}
