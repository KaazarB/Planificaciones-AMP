// Capa de datos: formato del plan (version_esquema 1)
// El plan vive en public/planes/<codigo>.json. Un bloque nuevo = subir otro JSON.

export type TipoDia = 'sesion' | 'clase' | 'carrera' | 'viaje' | 'descanso';
export type Campo = 'kg' | 'reps' | 'seg';

export interface Item {
  nombre: string;
  presc: string;
  series?: number;
  campos?: Campo[];
  obj?: string;
  kg?: string;
  video?: string; // link de YouTube solo para este ítem (si no, se usa la biblioteca del coach)
}

export interface Seccion {
  titulo: string;
  check: boolean;
  nota: string;
  items: Item[];
}

export interface Dia {
  fecha: string; // AAAA-MM-DD
  dia: string;
  bloque: number;
  semana: number;
  fase: string;
  tipo: TipoDia;
  titulo: string;
  objetivo: string;
  registro?: string[];
  secciones?: Seccion[];
}

export interface Plan {
  version_esquema: number;
  atleta: { nombre: string; apodo?: string; [clave: string]: unknown };
  bloque: { numero: number; inicio: string; fin: string; semanas: number; total_dias: number };
  reglas?: {
    version_B?: string;
    lumbar_semaforo?: { verde?: string; amarillo?: string; rojo?: string };
    ajuste_cargas?: string;
  };
  dias: Dia[];
}

// Clave estable de un ítem dentro del día: s{indiceSeccion}i{indiceItem}
export const claveItem = (s: number, i: number): string => `s${s}i${i}`;
