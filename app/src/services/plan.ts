// Capa de servicios: planes del atleta guardados en Supabase (tabla planes)

import type { Plan } from '../data/plan';

import { supabase } from './supabase';

export interface FilaPlan {
  id: number;
  atleta_id: string;
  bloque: number;
  inicio: string;
  fin: string;
  contenido: Plan;
  creado: string;
}

// Junta todos los bloques del atleta en un solo plan navegable (el calendario recorre todos)
export async function cargarPlan(atletaId: string): Promise<Plan | null> {
  const { data, error } = await supabase
    .from('planes')
    .select('*')
    .eq('atleta_id', atletaId)
    .order('inicio', { ascending: true });
  if (error) throw error;
  const filas = (data ?? []) as FilaPlan[];
  if (!filas.length) return null;

  const hoy = new Date().toISOString().slice(0, 10);
  // El bloque "actual" manda en reglas y avisos: el que contiene hoy, si no el próximo, si no el último
  const actual =
    filas.find((f) => f.inicio <= hoy && hoy <= f.fin) ?? filas.find((f) => f.inicio > hoy) ?? filas[filas.length - 1];

  const porFecha = new Map<string, Plan['dias'][number]>();
  for (const f of filas) for (const d of f.contenido.dias ?? []) porFecha.set(d.fecha, d);
  const dias = [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { ...actual.contenido, bloque: { ...actual.contenido.bloque }, dias };
}

export async function planesDe(atletaId: string): Promise<FilaPlan[]> {
  const { data, error } = await supabase
    .from('planes')
    .select('id, atleta_id, bloque, inicio, fin, creado')
    .eq('atleta_id', atletaId)
    .order('inicio', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FilaPlan[];
}

// Revisa que el JSON tenga el formato esperado antes de subirlo
export function validarPlan(json: unknown): Plan {
  const p = json as Plan;
  if (!p || typeof p !== 'object') throw new Error('El archivo no es un plan válido.');
  if (!Array.isArray(p.dias) || !p.dias.length) throw new Error('El plan no trae días («dias» vacío).');
  if (!p.bloque?.numero) throw new Error('Falta «bloque.numero».');
  const fechas = p.dias.map((d) => d.fecha).sort();
  const malas = p.dias.filter((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha ?? '') || !d.tipo || !d.titulo);
  if (malas.length) throw new Error(`Hay ${malas.length} día(s) sin fecha, tipo o título.`);
  p.bloque.inicio = p.bloque.inicio || fechas[0];
  p.bloque.fin = p.bloque.fin || fechas[fechas.length - 1];
  return p;
}

export async function subirPlan(atletaId: string, plan: Plan): Promise<void> {
  const { error } = await supabase.from('planes').insert({
    atleta_id: atletaId,
    bloque: plan.bloque.numero,
    inicio: plan.bloque.inicio,
    fin: plan.bloque.fin,
    contenido: plan,
  });
  if (error) throw error;
}

export async function borrarPlan(id: number): Promise<void> {
  const { error } = await supabase.from('planes').delete().eq('id', id);
  if (error) throw error;
}
