// Capa de servicios: biblioteca de videos de ejercicios (tabla videos en Supabase)

import type { Plan } from '../data/plan';
import { claveEjercicio } from '../domain/videos';

import { supabase } from './supabase';

export type Videos = Map<string, string>; // clave del ejercicio → link de YouTube

export async function leerVideos(): Promise<Videos> {
  const { data, error } = await supabase.from('videos').select('clave, url');
  if (error) throw error;
  return new Map((data ?? []).map((f: { clave: string; url: string }) => [f.clave, f.url]));
}

export async function guardarVideo(nombre: string, url: string): Promise<void> {
  const clave = claveEjercicio(nombre);
  const { error } = await supabase
    .from('videos')
    .upsert({ clave, nombre, url: url.trim(), actualizado: new Date().toISOString() });
  if (error) throw error;
}

export async function borrarVideo(nombre: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('clave', claveEjercicio(nombre));
  if (error) throw error;
}

// Todos los ejercicios distintos de todos los planes cargados (para que el coach les asigne video)
export async function ejerciciosDePlanes(): Promise<{ clave: string; nombre: string; veces: number }[]> {
  const { data, error } = await supabase.from('planes').select('contenido');
  if (error) throw error;
  const mapa = new Map<string, { clave: string; nombre: string; veces: number }>();
  for (const fila of (data ?? []) as { contenido: Plan }[]) {
    for (const dia of fila.contenido.dias ?? []) {
      for (const sec of dia.secciones ?? []) {
        for (const item of sec.items ?? []) {
          const nombre = item.nombre
            .replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (!nombre || nombre.endsWith(':')) continue;
          const clave = claveEjercicio(nombre);
          const actual = mapa.get(clave);
          if (actual) actual.veces += 1;
          else mapa.set(clave, { clave, nombre, veces: 1 });
        }
      }
    }
  }
  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
