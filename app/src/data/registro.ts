// Capa de datos: lo que el atleta registra en un día

export interface FilaSerie {
  kg?: string;
  reps?: string;
  seg?: string;
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
  actualizado: string; // ISO
}

export const registroVacio = (fecha: string): RegistroDia => ({
  fecha,
  checks: {},
  series: {},
  campos: {},
  actualizado: new Date(0).toISOString(),
});
