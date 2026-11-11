// Capa de lógica: mediciones de progreso del atleta a partir de lo que anota en la app
// (campos de registro como distancia, ritmo o peso; tests en segundos; WODs) y de su ficha.

import type { DatosFicha } from '../data/ficha';
import type { Dia } from '../data/plan';
import { claveItem } from '../data/plan';
import type { RegistroDia } from '../data/registro';

import { lunesDeSemana } from './cumplimiento';
import { diasEntre, esFechaISO } from './fechas';
import { numero } from './metricas';
import { resultadoWod, tituloWod, wodTieneDatos } from './wod';

export type Mejor = 'sube' | 'baja' | null; // hacia dónde es progreso (null: depende de la persona)

export interface Medicion {
  nombre: string;
  unidad: string; // «km», «min/km», «kg», «pasos»… (vacío si es un tiempo)
  formato: 'numero' | 'tiempo'; // tiempo: el valor está en segundos
  porSemana: boolean; // true: un punto por semana (suma o promedio); false: un punto por registro
  mejor: Mejor;
  puntos: { fecha: string; valor: number }[]; // en orden; con «porSemana», la fecha es el lunes
}

interface Tipo {
  unidad: string;
  formato: Medicion['formato'];
  agregar: 'suma' | 'promedio' | 'ultimo';
  mejor: Mejor;
}

// Campos que no son una medición de progreso: sensaciones, molestias o salud (esos los revisa el coach)
const NO_MIDE =
  /rpe|esfuerzo|energ[ií]a|tobillo|rodilla|hombro|lumbar|dolor|molestia|az[uú]car|glicemia|respiraci|s[ií]ntoma|piernas|qu[eé] hiciste|gimnasio o|c[oó]mo llegaste|sue[nñ]o|partido|f[uú]tbol|tiempo|minutos o km/i;

export function tipoDeCampo(etiqueta: string): Tipo | null {
  const e = etiqueta.toLowerCase();
  if (NO_MIDE.test(e)) return null;
  if (/ritmo|min\s*\/\s*km/.test(e)) return { unidad: 'min/km', formato: 'tiempo', agregar: 'ultimo', mejor: 'baja' };
  if (/distancia|\bkm\b/.test(e)) return { unidad: 'km', formato: 'numero', agregar: 'suma', mejor: 'sube' };
  if (/pasos/.test(e)) return { unidad: 'pasos', formato: 'numero', agregar: 'promedio', mejor: 'sube' };
  if (/minutos|duraci[oó]n|\(min/.test(e)) return { unidad: 'min', formato: 'numero', agregar: 'suma', mejor: 'sube' };
  if (/cintura/.test(e)) return { unidad: 'cm', formato: 'numero', agregar: 'ultimo', mejor: null };
  if (/peso/.test(e)) return { unidad: 'kg', formato: 'numero', agregar: 'ultimo', mejor: null };
  if (/\bfc\b|frecuencia/.test(e)) return { unidad: 'lpm', formato: 'numero', agregar: 'ultimo', mejor: null };
  return null;
}

// «Distancia (km, si la tienes)» → «Distancia»; «Peso en la mañana, opcional (kg)» → «Peso en la mañana»
export const nombreLimpio = (etiqueta: string): string =>
  etiqueta
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/,?\s*opcional\b/i, '')
    .trim();

// «8.500 pasos» → 8500 (con «miles», el punto separa miles); «8,5 km» → 8,5
export function valorNumerico(v: string, miles = false): number | null {
  const m = v.match(/\d+(?:[.,]\d+)*/);
  if (!m) return null;
  const texto = miles && /^\d{1,3}(\.\d{3})+$/.test(m[0]) ? m[0].replace(/\./g, '') : m[0];
  return numero(texto);
}

// «6:30» → 390 s; «1:02:15» → 3735 s; un número solo se lee en minutos (campos) o segundos (series)
export function segundosDe(v: string, numeroEn: 'min' | 'seg'): number | null {
  const t = v.match(/(\d+):(\d{1,2})(?::(\d{1,2}))?/);
  if (t) {
    const [h, m, s] = t[3] === undefined ? [0, t[1], t[2]] : [t[1], t[2], t[3]];
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }
  const n = valorNumerico(v);
  return n === null ? null : Math.round(numeroEn === 'min' ? n * 60 : n);
}

const promedio = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function agruparPorSemana(puntos: { fecha: string; valor: number }[], agregar: 'suma' | 'promedio') {
  const semanas = new Map<string, number[]>();
  for (const p of puntos) {
    const l = lunesDeSemana(p.fecha);
    semanas.set(l, [...(semanas.get(l) ?? []), p.valor]);
  }
  return [...semanas.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, vs]) => ({ fecha, valor: agregar === 'suma' ? vs.reduce((a, b) => a + b, 0) : promedio(vs) }));
}

// Campos de registro numéricos (distancia, ritmo, peso, pasos…) que el atleta fue anotando
export function medicionesDeCampos(registros: Record<string, RegistroDia>, hoy: string): Medicion[] {
  const grupos = new Map<string, { nombre: string; tipo: Tipo; puntos: { fecha: string; valor: number }[] }>();
  for (const [fecha, reg] of Object.entries(registros)) {
    if (fecha > hoy) continue;
    for (const [etiqueta, texto] of Object.entries(reg.campos ?? {})) {
      const tipo = texto?.trim() ? tipoDeCampo(etiqueta) : null;
      if (!tipo) continue;
      const valor =
        tipo.formato === 'tiempo' ? segundosDe(texto, 'min') : valorNumerico(texto, tipo.unidad === 'pasos');
      if (valor === null || valor <= 0) continue;
      const nombre = nombreLimpio(etiqueta);
      const clave = `${nombre.toLowerCase()}|${tipo.unidad}`;
      const g = grupos.get(clave) ?? { nombre, tipo, puntos: [] };
      g.puntos.push({ fecha, valor });
      grupos.set(clave, g);
    }
  }
  return [...grupos.values()].map(({ nombre, tipo, puntos }) => {
    const ordenados = puntos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const porSemana = tipo.agregar !== 'ultimo';
    return {
      nombre,
      unidad: tipo.unidad,
      formato: tipo.formato,
      porSemana,
      mejor: tipo.mejor,
      puntos: porSemana ? agruparPorSemana(ordenados, tipo.agregar as 'suma' | 'promedio') : ordenados,
    };
  });
}

// Tests con tiempo (series en segundos) en secciones o ejercicios de test: «Remo 500 m», «Plancha (máximo)»…
// (en un día de test, la plancha del core no es un test: se mira la sección y el ejercicio, no el día)
const ES_TEST = /test|retest|l[ií]nea base|benchmark|m[aá]ximo/i;
const MAS_ES_MEJOR = /m[aá]ximo|plancha|hold|colgad|isom|sostén|sosten|aguant/i;
const MENOS_ES_MEJOR = /\d\s*(m|km)\b|metros|remo|carrera|sprint|nado|bike|bici/i;

export function testsEnSegundos(dias: Dia[], registros: Record<string, RegistroDia>, hoy: string): Medicion[] {
  const grupos = new Map<string, { puntos: { fecha: string; valor: number }[]; mejor: Mejor }>();
  for (const d of dias) {
    const reg = registros[d.fecha];
    if (!reg || d.fecha > hoy) continue;
    (d.secciones ?? []).forEach((sec, si) =>
      sec.items.forEach((item, ii) => {
        if (!item.campos?.includes('seg')) return;
        if (!ES_TEST.test(`${sec.titulo} ${item.nombre}`)) return;
        const valores = (reg.series?.[claveItem(si, ii)] ?? [])
          .map((f) => (f?.seg ? segundosDe(f.seg, 'seg') : null))
          .filter((v): v is number => v !== null && v > 0);
        if (!valores.length) return;
        const nombre = reg.sustituciones?.[claveItem(si, ii)] || item.nombre;
        const mejor: Mejor = MAS_ES_MEJOR.test(nombre) ? 'sube' : MENOS_ES_MEJOR.test(nombre) ? 'baja' : null;
        const valor = mejor === 'sube' ? Math.max(...valores) : mejor === 'baja' ? Math.min(...valores) : valores[0];
        const g = grupos.get(nombre) ?? { puntos: [], mejor };
        g.puntos.push({ fecha: d.fecha, valor });
        grupos.set(nombre, g);
      }),
    );
  }
  return [...grupos.entries()].map(([nombre, g]) => ({
    nombre,
    unidad: '',
    formato: 'tiempo',
    porSemana: false,
    mejor: g.mejor,
    puntos: g.puntos.sort((a, b) => a.fecha.localeCompare(b.fecha)),
  }));
}

export interface WodHecho {
  fecha: string;
  titulo: string; // «AMRAP 12 min» o el WOD del plan
  resultado: string;
}

// «03 · WOD · CLEAN SCALED · FOR TIME…» → «Clean scaled · For Time…»; «WOD · AMRAP 12 MIN» → «AMRAP 12 min»
const SIGLAS: [RegExp, string][] = [
  [/\bamrap\b/gi, 'AMRAP'],
  [/\bemom\b/gi, 'EMOM'],
  [/\bfor time\b/gi, 'For Time'],
  [/\bwod\b/gi, 'WOD'],
  [/\brm\b/gi, 'RM'],
];
export const tituloSeccion = (t: string): string =>
  SIGLAS.reduce(
    (texto, [patron, sigla]) => texto.replace(patron, sigla),
    t
      .replace(/^\d+\s*·\s*/, '')
      .replace(/^wod\s*·\s*/i, '')
      .toLowerCase()
      .replace(/(^|·\s*)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()),
  );

// WODs con resultado: los armados paso a paso y los del plan con su campo «WOD…» anotado
export function wodsConResultado(dias: Dia[], registros: Record<string, RegistroDia>, hoy: string): WodHecho[] {
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const lista: WodHecho[] = [];
  for (const [fecha, reg] of Object.entries(registros)) {
    if (fecha > hoy) continue;
    const w = reg.libre?.wodArmado;
    if (w && wodTieneDatos(w)) lista.push({ fecha, titulo: tituloWod(w), resultado: resultadoWod(w) });
    for (const [etiqueta, texto] of Object.entries(reg.campos ?? {})) {
      if (!/\bwod\b/i.test(etiqueta) || !texto?.trim()) continue;
      const d = porFecha.get(fecha);
      const seccion = d?.secciones?.find((s) => /\bwod\b|benchmark/i.test(s.titulo));
      lista.push({
        fecha,
        titulo: seccion ? tituloSeccion(seccion.titulo) : (d?.titulo ?? 'WOD'),
        resultado: texto.trim(),
      });
    }
  }
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export interface Meta {
  objetivos: string[]; // lo que quiere lograr, según su ficha
  evento: { nombre: string; fecha: string; faltan: number; meta: string } | null;
  peso: Mejor; // si quiere bajar o subir de peso
}

const lista = (v: DatosFicha[string] | undefined): string[] =>
  Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? [v.trim()] : [];

export function metaDeFicha(f: DatosFicha | null, hoy: string): Meta {
  if (!f) return { objetivos: [], evento: null, peso: null };
  const cf = typeof f.objetivo_cf === 'string' && f.objetivo_cf ? [`CrossFit: ${f.objetivo_cf.toLowerCase()}`] : [];
  const objetivos = [...lista(f.objetivo), ...cf, ...lista(f.mejorar)];
  const fecha = f.fecha_evento;
  const faltan = esFechaISO(fecha) ? diasEntre(hoy, fecha) : -1;
  const evento =
    f.tiene_evento === 'Sí' && typeof f.evento === 'string' && f.evento.trim() && esFechaISO(fecha) && faltan >= 0
      ? {
          nombre: f.evento.trim(),
          fecha,
          faltan,
          meta: lista(f.marca_evento)[0] ?? lista(f.meta_evento)[0] ?? '',
        }
      : null;
  const quiere = (x: string) => objetivos.includes(x);
  const baja = quiere('Bajar de peso');
  const sube = quiere('Ganar masa muscular') || quiere('Ganar músculo');
  // Si no dijo nada del peso (o dijo las dos cosas), el peso no se juzga
  return { objetivos, evento, peso: baja && !sube ? 'baja' : sube && !baja ? 'sube' : null };
}

// Con el objetivo de la ficha, el peso (y la cintura, si quiere bajar) también tienen dirección
export const conObjetivo = (ms: Medicion[], meta: Meta): Medicion[] =>
  ms.map((m) => {
    if (m.mejor !== null || !meta.peso) return m;
    if (m.unidad === 'kg') return { ...m, mejor: meta.peso };
    if (m.unidad === 'cm' && meta.peso === 'baja') return { ...m, mejor: 'baja' };
    return m;
  });
