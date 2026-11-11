// Capa de lógica: WOD armado paso a paso (formato, tiempo, rondas, ejercicios y peso)

import type { EjercicioWod, WodArmado } from '../data/registro';

export const TIPO_CROSSFIT = 'Clase CrossFit';

export const PASOS_WOD = ['Formato', 'Tiempo', 'Rondas', 'Ejercicios', 'Peso'] as const;

export const FORMATOS_WOD = [
  { nombre: 'For Time', ayuda: 'Terminar todo lo más rápido posible (por rondas o chipper)' },
  { nombre: 'AMRAP', ayuda: 'Máximas rondas en un tiempo fijo' },
  { nombre: 'EMOM', ayuda: 'Cada minuto, al minuto' },
  { nombre: 'Intervalos', ayuda: 'Sets de trabajo con descanso entre medio' },
  { nombre: 'Otro', ayuda: 'Tabata, escalera, por equipos…' },
];

// Datos del WOD que se piden en los pasos «Tiempo» y «Rondas»
export type CampoWod = 'tiempo' | 'minutos' | 'descanso' | 'rondas' | 'repsExtra';

export interface CampoPaso {
  clave: CampoWod;
  etiqueta: string;
  unidad: string; // «min», «rondas»… (el tiempo final usa min y seg)
}

export interface PreguntaPaso {
  pregunta: string;
  ayuda?: string;
  campos: CampoPaso[];
}

const duracion: CampoPaso = { clave: 'minutos', etiqueta: 'Duración', unidad: 'min' };
const rondas = (etiqueta = 'Rondas', unidad = 'rondas'): CampoPaso => ({ clave: 'rondas', etiqueta, unidad });

// Lo que significa «tiempo» y «rondas» depende del formato
const PREGUNTAS: Record<string, { tiempo: PreguntaPaso; rondas: PreguntaPaso }> = {
  'For Time': {
    tiempo: {
      pregunta: '¿En cuánto lo terminaste?',
      ayuda: 'Si había un tiempo límite (time cap), anótalo también.',
      campos: [
        { clave: 'tiempo', etiqueta: 'Tu tiempo', unidad: '' },
        { clave: 'minutos', etiqueta: 'Time cap', unidad: 'min' },
      ],
    },
    rondas: {
      pregunta: '¿Cuántas rondas eran?',
      ayuda: 'Una sola pasada (chipper) es 1. Si las repeticiones bajan cada ronda (21-15-9), son 3.',
      campos: [rondas()],
    },
  },
  AMRAP: {
    tiempo: { pregunta: '¿De cuántos minutos era?', campos: [duracion] },
    rondas: {
      pregunta: '¿Cuántas rondas completaste?',
      ayuda: 'Si quedaste a mitad de una ronda, anota esas repeticiones aparte.',
      campos: [rondas('Rondas completas'), { clave: 'repsExtra', etiqueta: 'Reps extra', unidad: 'reps' }],
    },
  },
  EMOM: {
    tiempo: { pregunta: '¿Cuántos minutos duró?', campos: [duracion] },
    rondas: {
      pregunta: '¿Cuántas rondas hiciste?',
      ayuda: 'Con un ejercicio por minuto, son tantas como minutos. Si alternabas ejercicios, cuenta las vueltas.',
      campos: [rondas()],
    },
  },
  Intervalos: {
    tiempo: {
      pregunta: '¿Cuánto duraba cada set y cuánto descansabas?',
      campos: [
        { clave: 'minutos', etiqueta: 'Trabajo por set', unidad: 'min' },
        { clave: 'descanso', etiqueta: 'Descanso entre sets', unidad: 'min' },
      ],
    },
    rondas: { pregunta: '¿Cuántos sets hiciste?', campos: [rondas('Sets', 'sets')] },
  },
  Otro: {
    tiempo: { pregunta: '¿Cuánto duró?', campos: [duracion] },
    rondas: { pregunta: '¿Cuántas rondas eran?', ayuda: 'Si no aplica, pasa al siguiente paso.', campos: [rondas()] },
  },
};

export const preguntaTiempo = (w: WodArmado): PreguntaPaso => (PREGUNTAS[w.formato] ?? PREGUNTAS.Otro).tiempo;
export const preguntaRondas = (w: WodArmado): PreguntaPaso => (PREGUNTAS[w.formato] ?? PREGUNTAS.Otro).rondas;

// Movimientos frecuentes para autocompletar (se suman los ejercicios del plan del atleta)
export const MOVIMIENTOS_WOD = [
  'Air squat',
  'Assault bike',
  'Bar muscle-up',
  'Box jump',
  'Box jump over',
  'Burpee',
  'Burpee box jump over',
  'Burpee over bar',
  'Chest to bar',
  'Clean',
  'Clean & jerk',
  'Deadlift',
  'Devil press',
  'Double unders',
  'Dumbbell snatch',
  'Farmer carry',
  'Front squat',
  'GHD sit-up',
  'Handstand push-up',
  'Handstand walk',
  'Hang power clean',
  'Kettlebell swing',
  'Lunge',
  'Muscle-up',
  'Overhead squat',
  'Pistol',
  'Power clean',
  'Power snatch',
  'Pull-up',
  'Push jerk',
  'Push press',
  'Push-up',
  'Remo',
  'Ring dip',
  'Rope climb',
  'Single unders',
  'Sit-up',
  'Ski erg',
  'Snatch',
  'Squat clean',
  'Thruster',
  'Toes to bar',
  'Trote',
  'Walking lunge',
  'Wall ball',
  'Wall walk',
];

export function movimientosSugeridos(delPlan: string[] = []): string[] {
  const vistos = new Map<string, string>();
  for (const n of [...MOVIMIENTOS_WOD, ...delPlan]) {
    const clave = n.trim().toLowerCase();
    if (clave && !vistos.has(clave)) vistos.set(clave, n.trim());
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export const wodNuevo = (): WodArmado => ({ formato: '', ejercicios: [{ nombre: '' }] });

const lleno = (v?: string) => Boolean(v?.trim());
const ejercicioConDatos = (e: EjercicioWod) => lleno(e.nombre) || lleno(e.reps) || lleno(e.kg);
const tiempoConDatos = (t?: string) => /\d/.test(t ?? '');

// ¿Se anotó algo en el WOD?
export function wodTieneDatos(w?: WodArmado): boolean {
  if (!w) return false;
  return (
    lleno(w.formato) ||
    tiempoConDatos(w.tiempo) ||
    [w.minutos, w.descanso, w.rondas, w.repsExtra].some(lleno) ||
    (w.ejercicios ?? []).some(ejercicioConDatos)
  );
}

// Al terminar: sin filas de ejercicios vacías; sin nada anotado, no queda WOD
export function limpiarWod(w: WodArmado): WodArmado | undefined {
  const limpio = { ...w, ejercicios: (w.ejercicios ?? []).filter(ejercicioConDatos) };
  return wodTieneDatos(limpio) ? limpio : undefined;
}

// Tiempo final «min:seg» tal como se escribió → partes para las dos casillas
export function partesTiempo(t?: string): { min: string; seg: string } {
  const [min = '', seg = ''] = (t ?? '').split(':');
  return { min, seg };
}

export const unirTiempo = (min: string, seg: string): string | undefined => (min || seg ? `${min}:${seg}` : undefined);

// «6:7» → «6:07»; «:45» → «0:45»; «6:75» → «7:15»
export function formatearTiempo(t?: string): string {
  if (!tiempoConDatos(t)) return '';
  const { min, seg } = partesTiempo(t);
  const total = (parseInt(min, 10) || 0) * 60 + (parseInt(seg, 10) || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const conUnidad = (v: string | undefined, singular: string, plural: string) =>
  lleno(v) ? `${v!.trim()} ${v!.trim() === '1' ? singular : plural}` : '';

// Primera línea del resumen: «AMRAP 12 min», «For Time · 3 rondas · time cap 15 min»…
export function tituloWod(w: WodArmado): string {
  const min = lleno(w.minutos) ? `${w.minutos!.trim()} min` : '';
  const partes: string[] = [];
  switch (w.formato) {
    case 'For Time':
      partes.push('For Time', conUnidad(w.rondas, 'ronda', 'rondas'), min && `time cap ${min}`);
      break;
    case 'AMRAP':
      partes.push(min ? `AMRAP ${min}` : 'AMRAP');
      break;
    case 'EMOM':
      partes.push(min ? `EMOM ${min}` : 'EMOM', conUnidad(w.rondas, 'ronda', 'rondas'));
      break;
    case 'Intervalos':
      partes.push(
        'Intervalos',
        conUnidad(w.rondas, 'set', 'sets'),
        min && `${min} de trabajo`,
        lleno(w.descanso) ? `${w.descanso!.trim()} min de descanso` : '',
      );
      break;
    default:
      partes.push('WOD', min, conUnidad(w.rondas, 'ronda', 'rondas'));
  }
  return partes.filter(Boolean).join(' · ');
}

// Resultado del atleta: tiempo (For Time) o rondas + reps (AMRAP)
export function resultadoWod(w: WodArmado): string {
  if (w.formato === 'For Time' && tiempoConDatos(w.tiempo)) return `Tiempo: ${formatearTiempo(w.tiempo)}`;
  if (w.formato === 'AMRAP' && (lleno(w.rondas) || lleno(w.repsExtra))) {
    const r = conUnidad(w.rondas || '0', 'ronda', 'rondas');
    return lleno(w.repsExtra) ? `${r} + ${w.repsExtra!.trim()} reps` : r;
  }
  return '';
}
