// Capa de servicios: registro de correos enviados por el coach (tabla correos_enviados)

import { supabase } from './supabase';

export type TipoCorreo = 'guia';

// Último envío de cada atleta para un tipo de correo: atleta_id → fecha
export async function ultimosEnvios(tipo: TipoCorreo): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('correos_enviados')
    .select('atleta_id, enviado')
    .eq('tipo', tipo)
    .order('enviado', { ascending: false });
  if (error) throw error;
  const m = new Map<string, string>();
  for (const f of (data ?? []) as { atleta_id: string; enviado: string }[])
    if (!m.has(f.atleta_id)) m.set(f.atleta_id, f.enviado);
  return m;
}

// Devuelve el id del registro para poder deshacerlo
export async function registrarEnvio(atletaId: string, tipo: TipoCorreo): Promise<{ id: number; enviado: string }> {
  const { data, error } = await supabase
    .from('correos_enviados')
    .insert({ atleta_id: atletaId, tipo })
    .select('id, enviado')
    .single();
  if (error) throw error;
  return data as { id: number; enviado: string };
}

export async function deshacerEnvio(id: number): Promise<void> {
  const { error } = await supabase.from('correos_enviados').delete().eq('id', id);
  if (error) throw error;
}
