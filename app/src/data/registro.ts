// Capa de datos: lo que el atleta registra en un día

export interface FilaSerie {
  kg?: string;
  reps?: string;
  seg?: string;
  hecha?: boolean; // marcada con ✓ (con o sin cambiar el peso)
}

// Entrenamiento que el atleta arma él mismo en un día sin planificación (o de descanso)
export interface EjercicioLibre {
  nombre: string;
  series: FilaSerie[];
}

// WOD armado paso a paso (entrenamiento libre de tipo «Clase CrossFit»)
export interface EjercicioWod {
  nombre: string;
  reps?: string; // por ronda: «10», «21-15-9», «200 m», «15 cal»
  kg?: string; // peso usado; vacío = sin peso
}

export interface WodArmado {
  formato: string; // «For Time», «AMRAP», «EMOM», «Intervalos», «Otro»
  minutos?: string; // duración (AMRAP, EMOM, Otro), time cap (For Time) o trabajo por set (Intervalos)
  descanso?: string; // Intervalos: minutos de descanso entre sets
  tiempo?: string; // For Time: tiempo final «min:seg»
  rondas?: string; // rondas del WOD; en AMRAP, rondas completas
  repsExtra?: string; // AMRAP: repeticiones de la ronda incompleta
  ejercicios: EjercicioWod[];
}

export interface SesionLibre {
  tipo: string; // «Clase CrossFit», «Fuerza», …
  minutos?: string;
  ejercicios: EjercicioLibre[];
  wod?: string; // WOD o descripción libre (con un WOD armado: notas del WOD)
  wodArmado?: WodArmado;
}

export interface RegistroDia {
  fecha: string; // AAAA-MM-DD, igual que el día del plan
  checks: Record<string, boolean>; // clave s{i}i{j}
  series: Record<string, FilaSerie[]>; // clave s{i}i{j} → una fila por serie
  campos: Record<string, string>; // campos de "registro" del día (texto libre)
  clase?: string; // días de clase: qué se hizo
  rpe?: number; // 1-10
  lumbarAntes?: number; // 0-10
  lumbarDespues?: number; // 0-10
  sueno?: string; // horas o Body Battery
  notas?: string;
  sustituciones?: Record<string, string>; // clave s{i}i{j} → ejercicio que hizo en vez del original
  cerrada?: string; // ISO: cuándo el atleta tocó «Registrar sesión»
  libre?: SesionLibre; // entrenamiento armado por el atleta
  actualizado: string; // ISO
}

export const registroVacio = (fecha: string): RegistroDia => ({
  fecha,
  checks: {},
  series: {},
  campos: {},
  actualizado: new Date(0).toISOString(),
});
