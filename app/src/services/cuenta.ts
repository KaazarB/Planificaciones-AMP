// Capa de servicios: cuenta del usuario (ingreso, perfil y ficha) en Supabase

import type { Session } from '@supabase/supabase-js';

import type { DatosFicha } from '../data/ficha';

import { supabase } from './supabase';

export type Rol = 'atleta' | 'coach';
export type Estado = 'ficha' | 'evaluacion' | 'activo' | 'pausa';

export interface Perfil {
  id: string;
  nombre: string;
  apodo: string;
  rol: Rol;
  estado: Estado;
  creado: string;
  whatsapp?: string;
  correo?: string;
}

// Traduce los errores de Supabase a mensajes claros
export function mensajeError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/codigo_invalido|Database error saving new user/i.test(m))
    return 'El código de invitación no es válido o ya no está activo. Pídele uno a tu coach.';
  if (/Invalid login credentials/i.test(m)) return 'Correo o clave incorrectos.';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Ingresa con tu clave.';
  if (/Password should be at least/i.test(m)) return 'La clave es muy corta. Usa al menos 8 caracteres.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo antes de ingresar (revisa tu bandeja).';
  if (/valid email|invalid.*email/i.test(m)) return 'Revisa que el correo esté bien escrito.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return m;
}

export async function sesionActual(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function entrar(correo: string, clave: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
  if (error) throw error;
}

// Devuelve true si quedó con sesión abierta; false si debe confirmar el correo primero
export async function crearCuenta(
  nombre: string,
  correo: string,
  clave: string,
  codigo: string,
  whatsapp: string,
): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email: correo.trim(),
    password: clave,
    options: {
      data: { nombre: nombre.trim(), codigo: codigo.trim().toUpperCase(), whatsapp: whatsapp.trim() },
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
  return Boolean(data.session);
}

export async function salir(): Promise<void> {
  await supabase.auth.signOut();
}

export async function leerPerfil(id: string): Promise<Perfil | null> {
  const { data, error } = await supabase.from('perfiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Perfil | null;
}

export async function guardarApodo(id: string, apodo: string): Promise<void> {
  const { error } = await supabase.from('perfiles').update({ apodo }).eq('id', id);
  if (error) throw error;
}

export async function leerFicha(atletaId: string): Promise<DatosFicha | null> {
  const { data, error } = await supabase.from('fichas').select('datos').eq('atleta_id', atletaId).maybeSingle();
  if (error) throw error;
  return (data?.datos as DatosFicha) ?? null;
}

// Lo justo de varias fichas para el panel del coach: cuándo la envió, su WhatsApp y cuándo quiere empezar
export interface FichaBreve {
  actualizado: string;
  whatsapp: string;
  inicio: string;
}

export async function fichasBreves(ids: string[]): Promise<Map<string, FichaBreve>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from('fichas')
    .select('atleta_id, actualizado, whatsapp:datos->>whatsapp, inicio:datos->>inicio')
    .in('atleta_id', ids);
  if (error) throw error;
  const filas = (data ?? []) as {
    atleta_id: string;
    actualizado: string;
    whatsapp: string | null;
    inicio: string | null;
  }[];
  return new Map(
    filas.map((f) => [f.atleta_id, { actualizado: f.actualizado, whatsapp: f.whatsapp ?? '', inicio: f.inicio ?? '' }]),
  );
}

export async function enviarFicha(atletaId: string, datos: DatosFicha): Promise<void> {
  const { error } = await supabase
    .from('fichas')
    .upsert({ atleta_id: atletaId, datos, actualizado: new Date().toISOString() });
  if (error) throw error;
}
