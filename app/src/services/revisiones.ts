// Capa de servicios: revisiones de fin de bloque (tabla revisiones)

import type { DatosFicha } from '../data/ficha';

import { supabase } from './supabase';

export interface Revision {
  atleta_id: string;
  bloque: number;
  datos: DatosFicha;
  creado: string;
}

export async function leerRevision(atletaId: string, bloque: number): Promise<Revision | null> {
  const { data, error } = await supabase
    .from('revisiones')
    .select('*')
    .eq('atleta_id', atletaId)
    .eq('bloque', bloque)
    .maybeSingle();
  if (error) throw error;
  return data as Revision | null;
}

export async function enviarRevision(atletaId: string, bloque: number, datos: DatosFicha): Promise<void> {
  const { error } = await supabase
    .from('revisiones')
    .upsert({ atleta_id: atletaId, bloque, datos }, { onConflict: 'atleta_id,bloque' });
  if (error) throw error;
}

// Para el coach: qué bloques ya tienen revisión respondida («atleta:bloque»)
export async function revisionesRespondidas(): Promise<Set<string>> {
  const { data, error } = await supabase.from('revisiones').select('atleta_id, bloque');
  if (error) throw error;
  return new Set(((data ?? []) as { atleta_id: string; bloque: number }[]).map((r) => `${r.atleta_id}:${r.bloque}`));
}

export async function ultimaRevision(atletaId: string): Promise<Revision | null> {
  const { data, error } = await supabase
    .from('revisiones')
    .select('*')
    .eq('atleta_id', atletaId)
    .order('bloque', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Revision | null;
}
