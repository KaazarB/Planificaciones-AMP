// Capa de lógica de negocio: cálculos de semanas y fechas

import type { Sesion } from '../data/semana';

// Devuelve el lunes de la semana de una fecha
export function lunesDe(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diaSemana = d.getDay(); // 0 = domingo, 1 = lunes...
  const diferencia = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + diferencia);
  return d;
}

export function sumarDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

// Convierte una fecha al formato AAAA-MM-DD (el mismo de los id)
export function aTextoISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// Filtra las sesiones que caen entre el lunes y el domingo de esa semana
export function sesionesDeLaSemana(todas: Sesion[], lunes: Date): Sesion[] {
  const desde = aTextoISO(lunes);
  const hasta = aTextoISO(sumarDias(lunes, 6));
  return todas.filter((s) => s.id >= desde && s.id <= hasta);
}

// Texto para mostrar, por ejemplo "9 nov – 15 nov"
export function textoSemana(lunes: Date): string {
  const formato = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  return `${formato(lunes)} – ${formato(sumarDias(lunes, 6))}`;
}