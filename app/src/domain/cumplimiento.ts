// Capa de lógica: cumplimiento del atleta semana a semana (lo que ve en «Progreso»)
// Usa las mismas reglas que el dashboard del coach: un entreno exigido está cumplido si tiene algo anotado,
// los «(opcional)» no se exigen y el de hoy cuenta recién cuando lo registra.

import type { Dia } from '../data/plan';
import type { RegistroDia } from '../data/registro';

import { lunesDeISO, sumarDias } from './fechas';
import { tieneLibre } from './libre';
import { cuentaComoEntreno, esOpcional, pct, tieneDatos } from './metricas';

export type EstadoDia =
  | 'cumplido' // entreno exigido con registro
  | 'pendiente' // entreno exigido de hoy o de un día que viene
  | 'sin-registro' // entreno exigido que ya pasó sin nada anotado
  | 'opcional' // entreno opcional que no hizo (o que viene)
  | 'extra' // entrenó fuera de lo exigido: un opcional, o en descanso / sin plan
  | 'descanso'; // descanso, viaje o día sin plan, sin entrenar

export interface DiaSemana {
  fecha: string;
  nombre: string; // «Lunes»
  letra: string; // «L»
  numero: number; // día del mes
  estado: EstadoDia;
  conExtra: boolean; // en un día de entreno, además anotó un entrenamiento extra
  hoy: boolean;
  titulo: string; // título del plan ('' si ese día no hay plan)
}

export interface ResumenSemanal {
  lunes: string;
  bloque: number | null;
  semana: number | null;
  dias: DiaSemana[];
  cumplidos: number;
  total: number; // entrenos exigidos de la semana
  sinRegistro: number;
  pendientes: number;
  extras: number;
  porcentaje: number | null; // cumplidos / total de la semana
}

export interface Constancia {
  semanas: ResumenSemanal[]; // desde la primera semana del plan hasta la actual
  actual: ResumenSemanal | null;
  cumplidos: number; // desde el inicio
  vencidos: number; // entrenos exigidos que ya cuentan (pasados, y hoy si lo registró)
  porcentaje: number | null; // cumplidos / vencidos
  racha: number; // entrenos exigidos cumplidos seguidos
  extras: number;
}

const NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Lunes de la semana de una fecha AAAA-MM-DD
export const lunesDeSemana = (iso: string): string => {
  const lunesSiguiente = lunesDeISO(iso);
  return lunesSiguiente === iso ? iso : sumarDias(lunesSiguiente, -7);
};

function estadoDe(d: Dia | undefined, reg: RegistroDia | undefined, fecha: string, hoy: string): EstadoDia {
  const anotado = fecha <= hoy && tieneDatos(reg);
  if (d && cuentaComoEntreno(d)) return anotado ? 'cumplido' : fecha < hoy ? 'sin-registro' : 'pendiente';
  if (d && esOpcional(d)) return anotado ? 'extra' : 'opcional';
  return fecha <= hoy && tieneLibre(reg?.libre) ? 'extra' : 'descanso';
}

export function resumenSemanal(
  porFecha: Map<string, Dia>,
  registros: Record<string, RegistroDia>,
  lunes: string,
  hoy: string,
): ResumenSemanal {
  const dias: DiaSemana[] = NOMBRES.map((nombre, i) => {
    const fecha = sumarDias(lunes, i);
    const d = porFecha.get(fecha);
    const reg = registros[fecha];
    const estado = estadoDe(d, reg, fecha, hoy);
    return {
      fecha,
      nombre,
      letra: nombre[0],
      numero: Number(fecha.slice(8)),
      estado,
      conExtra: estado === 'cumplido' && tieneLibre(reg?.libre),
      hoy: fecha === hoy,
      titulo: d?.titulo ?? '',
    };
  });
  const cuenta = (e: EstadoDia) => dias.filter((d) => d.estado === e).length;
  const cumplidos = cuenta('cumplido');
  const sinRegistro = cuenta('sin-registro');
  const pendientes = cuenta('pendiente');
  const total = cumplidos + sinRegistro + pendientes;
  const delPlan = dias.map((d) => porFecha.get(d.fecha)).find(Boolean);
  return {
    lunes,
    bloque: delPlan?.bloque ?? null,
    semana: delPlan?.semana ?? null,
    dias,
    cumplidos,
    total,
    sinRegistro,
    pendientes,
    extras: cuenta('extra') + dias.filter((d) => d.conExtra).length,
    porcentaje: pct(cumplidos, total),
  };
}

// Entrenos exigidos cumplidos seguidos, hacia atrás desde el último que ya cuenta (hoy sin registrar no corta)
export function racha(dias: Dia[], registros: Record<string, RegistroDia>, hoy: string): number {
  const exigidos = dias
    .filter((d) => cuentaComoEntreno(d) && d.fecha <= hoy)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  let n = 0;
  for (const d of exigidos) {
    if (tieneDatos(registros[d.fecha])) n++;
    else if (d.fecha !== hoy) break;
  }
  return n;
}

export function calcularConstancia(dias: Dia[], registros: Record<string, RegistroDia>, hoy: string): Constancia {
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const fechas = dias.map((d) => d.fecha).sort();
  const lunesHoy = lunesDeSemana(hoy);
  const semanas: ResumenSemanal[] = [];
  if (fechas.length) {
    const ultimo = lunesDeSemana(fechas[fechas.length - 1]);
    const hasta = ultimo < lunesHoy ? ultimo : lunesHoy;
    for (let l = lunesDeSemana(fechas[0]); l <= hasta; l = sumarDias(l, 7))
      semanas.push(resumenSemanal(porFecha, registros, l, hoy));
  }
  const cumplidos = semanas.reduce((n, s) => n + s.cumplidos, 0);
  const vencidos = cumplidos + semanas.reduce((n, s) => n + s.sinRegistro, 0);
  return {
    semanas,
    actual: semanas.find((s) => s.lunes === lunesHoy) ?? null,
    cumplidos,
    vencidos,
    porcentaje: pct(cumplidos, vencidos),
    racha: racha(dias, registros, hoy),
    extras: semanas.reduce((n, s) => n + s.extras, 0),
  };
}
