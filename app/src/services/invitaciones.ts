// Capa de servicios: códigos de invitación (solo el coach los ve)

import { supabase } from './supabase';

export interface Invitacion {
  codigo: string;
  nota: string;
  usos: number;
  usos_max: number | null;
  activo: boolean;
  creado: string;
}

// Sin letras que se confunden (O/0, I/1)
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function codigoNuevo(): string {
  const n = new Uint32Array(6);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join('');
}

export async function leerInvitaciones(): Promise<Invitacion[]> {
  const { data, error } = await supabase.from('invitaciones').select('*').order('creado', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invitacion[];
}

export async function crearInvitacion(nota: string, usosMax: number | null): Promise<void> {
  const { error } = await supabase.from('invitaciones').insert({ codigo: codigoNuevo(), nota, usos_max: usosMax });
  if (error) throw error;
}

export async function cambiarActivo(codigo: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('invitaciones').update({ activo }).eq('codigo', codigo);
  if (error) throw error;
}

export function enlaceInvitacion(codigo: string): string {
  return `${window.location.origin}${window.location.pathname}?codigo=${codigo}`;
}

export function mensajeInvitacion(codigo: string): string {
  return (
    '¡Hola! 👋 Para armar tu planificación personalizada primero necesito conocerte.\n\n' +
    `1️⃣ Abre este link en Safari (iPhone) o Chrome (Android):\n${enlaceInvitacion(codigo)}\n\n` +
    '2️⃣ Instálala: en iPhone, Compartir → «Agregar a pantalla de inicio»; en Android, ⋮ → «Instalar app».\n\n' +
    `3️⃣ Toca «Crear cuenta» (tu código de invitación es ${codigo}) y completa tu ficha.\n\n` +
    'Cuando la envíes me llega a mí y te escribo para armar tu plan juntos 💪'
  );
}
