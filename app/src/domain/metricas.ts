// Capa de lógica: métricas de entrenamiento para el dashboard del coach
// Cruza el plan (lo que tocaba) con los registros (lo que el atleta anotó).

import type { Dia } from '../data/plan';
import { claveItem } from '../data/plan';
import type { RegistroDia } from '../data/registro';

import { diasEntre } from './fechas';
import { serieHecha, seriesSeccion } from './progreso';
import { aTextoISO, lunesDe } from './semanas';

// Días que cuentan como entrenamiento planificado
const ENTRENA: Dia['tipo'][] = ['sesion', 'clase', 'carrera'];

// ¿El atleta anotó algo ese día? (misma regla que el calendario)
export function tieneDatos(r?: RegistroDia): boolean {
  if (!r) return false;
  return Boolean(
    r.cerrada ||
    r.rpe !== undefined ||
    r.notas ||
    r.clase ||
    Object.values(r.checks ?? {}).some(Boolean) ||
    Object.values(r.campos ?? {}).some(Boolean) ||
    Object.values(r.series ?? {}).some((filas) => filas.some(serieHecha)),
  );
}

// "62,5" o "62.5 kg" → 62.5
export function numero(v?: string): number | null {
  if (!v) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const lunesISO = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return aTextoISO(lunesDe(new Date(a, m - 1, d)));
};

const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface SemanaMetrica {
  lunes: string; // AAAA-MM-DD
  bloque: number | null;
  semana: number | null; // semana dentro del bloque
  fase: string;
  planificados: number; // días de entrenamiento ya vencidos (hasta hoy)
  hechos: number; // de esos, cuántos tienen registro
  totalSemana: number; // días de entrenamiento de toda la semana
  seriesPlan: number;
  seriesHechas: number;
  tonelaje: number; // kg × reps
  rpe: number | null; // promedio
  lumbar: number | null; // máximo «después»
  futura: boolean;
}

export interface PuntoEjercicio {
  fecha: string;
  kg: number;
}

export interface Ejercicio {
  nombre: string;
  puntos: PuntoEjercicio[]; // mejor kg de cada día, en orden
  inicial: number;
  mejor: number;
}

export type Gravedad = 'critica' | 'atencion';
export interface Alerta {
  gravedad: Gravedad;
  texto: string;
}

export interface ResumenAtleta {
  semanas: SemanaMetrica[];
  actual: SemanaMetrica | null;
  adherencia: number | null; // % del bloque hasta hoy
  adherencia4: number | null; // % de las últimas 4 semanas
  ultimoRegistro: string | null;
  diasSinRegistro: number | null;
  rpe: number | null; // promedio últimas 2 semanas
  ejercicios: Ejercicio[];
  alertas: Alerta[];
  registrosSemana: number; // días con registro en los últimos 7
}

export const pct = (hechos: number, total: number): number | null =>
  total ? Math.round((hechos / total) * 100) : null;

export function calcularResumen(dias: Dia[], registros: Record<string, RegistroDia>, hoy: string): ResumenAtleta {
  const porSemana = new Map<string, SemanaMetrica>();
  const lumbares: number[] = [];
  const rpesRecientes: number[] = [];
  const puntos = new Map<string, Map<string, number>>();
  const alertas: Alerta[] = [];

  const semanaDe = (d: Dia): SemanaMetrica => {
    const lunes = lunesISO(d.fecha);
    let s = porSemana.get(lunes);
    if (!s) {
      s = {
        lunes,
        bloque: d.bloque ?? null,
        semana: d.semana ?? null,
        fase: d.fase ?? '',
        planificados: 0,
        hechos: 0,
        totalSemana: 0,
        seriesPlan: 0,
        seriesHechas: 0,
        tonelaje: 0,
        rpe: null,
        lumbar: null,
        futura: lunes > hoy,
      };
      porSemana.set(lunes, s);
    }
    return s;
  };

  const rpesPorSemana = new Map<string, number[]>();

  for (const d of [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const s = semanaDe(d);
    const reg = registros[d.fecha];
    const entrena = ENTRENA.includes(d.tipo);
    const vencido = d.fecha <= hoy;
    if (entrena) s.totalSemana++;
    if (entrena && vencido) {
      s.planificados++;
      if (tieneDatos(reg)) s.hechos++;
    }

    (d.secciones ?? []).forEach((sec, si) => {
      if (!vencido) return;
      if (!sec.check) {
        const total = sec.items.reduce((n, it) => n + (it.series ?? 0), 0);
        s.seriesPlan += total;
        if (reg) s.seriesHechas += seriesSeccion(sec, si, reg)[0];
      }
      if (!reg) return;
      sec.items.forEach((item, ii) => {
        const clave = claveItem(si, ii);
        const filas = reg.series?.[clave] ?? [];
        const nombre = reg.sustituciones?.[clave] || item.nombre;
        let mejor = 0;
        for (const f of filas) {
          const kg = numero(f?.kg);
          const reps = numero(f?.reps);
          if (kg && reps) s.tonelaje += kg * reps;
          if (kg && kg > mejor) mejor = kg;
        }
        if (mejor > 0) {
          const m = puntos.get(nombre) ?? new Map<string, number>();
          m.set(d.fecha, Math.max(m.get(d.fecha) ?? 0, mejor));
          puntos.set(nombre, m);
        }
      });
    });

    if (reg && vencido) {
      if (typeof reg.rpe === 'number') {
        const l = rpesPorSemana.get(s.lunes) ?? [];
        l.push(reg.rpe);
        rpesPorSemana.set(s.lunes, l);
        if (diasEntre(d.fecha, hoy) < 14) rpesRecientes.push(reg.rpe);
      }
      if (typeof reg.lumbarDespues === 'number') {
        s.lumbar = Math.max(s.lumbar ?? 0, reg.lumbarDespues);
        if (diasEntre(d.fecha, hoy) < 14) lumbares.push(reg.lumbarDespues);
        if (reg.lumbarDespues >= 6 && diasEntre(d.fecha, hoy) < 14)
          alertas.push({ gravedad: 'critica', texto: `Molestia lumbar ${reg.lumbarDespues}/10 el ${d.fecha}` });
      }
    }
  }

  // Registros fuera del plan (ej. días extra) también cuentan para «último registro»
  const fechasConDatos = Object.keys(registros)
    .filter((f) => f <= hoy && tieneDatos(registros[f]))
    .sort();
  const ultimoRegistro = fechasConDatos.length ? fechasConDatos[fechasConDatos.length - 1] : null;
  const diasSinRegistro = ultimoRegistro ? diasEntre(ultimoRegistro, hoy) : null;
  const registrosSemana = fechasConDatos.filter((f) => diasEntre(f, hoy) < 7).length;

  const semanas = [...porSemana.values()].sort((a, b) => a.lunes.localeCompare(b.lunes));
  for (const s of semanas) s.rpe = promedio(rpesPorSemana.get(s.lunes) ?? []);

  const lunesHoy = lunesISO(hoy);
  const actual = semanas.find((s) => s.lunes === lunesHoy) ?? null;
  const pasadas = semanas.filter((s) => !s.futura);
  const suma = (xs: SemanaMetrica[], k: 'hechos' | 'planificados') => xs.reduce((n, s) => n + s[k], 0);
  const ult4 = pasadas.slice(-4);

  // Entrenamientos vencidos sin registrar, seguidos y recientes
  const vencidos = dias
    .filter((d) => ENTRENA.includes(d.tipo) && d.fecha <= hoy && diasEntre(d.fecha, hoy) <= 10)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  let seguidos = 0;
  for (const d of vencidos) {
    if (tieneDatos(registros[d.fecha])) break;
    seguidos++;
  }
  if (seguidos >= 3) alertas.push({ gravedad: 'atencion', texto: `${seguidos} entrenamientos seguidos sin registrar` });
  const rpeAlto = rpesRecientes.filter((r) => r >= 9).length;
  if (rpeAlto >= 2) alertas.push({ gravedad: 'atencion', texto: `${rpeAlto} sesiones con RPE 9–10 en 2 semanas` });

  const ejercicios: Ejercicio[] = [...puntos.entries()]
    .map(([nombre, m]) => {
      const ps = [...m.entries()].map(([fecha, kg]) => ({ fecha, kg })).sort((a, b) => a.fecha.localeCompare(b.fecha));
      return { nombre, puntos: ps, inicial: ps[0].kg, mejor: Math.max(...ps.map((p) => p.kg)) };
    })
    .sort((a, b) => b.puntos.length - a.puntos.length || b.mejor - a.mejor);

  return {
    semanas,
    actual,
    adherencia: pct(suma(pasadas, 'hechos'), suma(pasadas, 'planificados')),
    adherencia4: pct(suma(ult4, 'hechos'), suma(ult4, 'planificados')),
    ultimoRegistro,
    diasSinRegistro,
    rpe: promedio(rpesRecientes),
    ejercicios,
    alertas,
    registrosSemana,
  };
}
