// Capa de datos: modelo de una sesión y semana de ejemplo

export type TipoSesion = 'CrossFit' | 'Halterofilia' | 'Running' | 'Descanso';

export interface Sesion {
  dia: string;
  fecha: string;
  tipo: TipoSesion;
  titulo: string;
  detalle: string;
}

export const semanaEjemplo: Sesion[] = [
  { dia: 'Lunes', fecha: '9 nov', tipo: 'CrossFit', titulo: 'Fuerza + gimnasia', detalle: 'Sesión propia (hasta 2 h)' },
  { dia: 'Martes', fecha: '10 nov', tipo: 'Halterofilia', titulo: 'Clase de levantamiento', detalle: 'Técnica de snatch' },
  { dia: 'Miércoles', fecha: '11 nov', tipo: 'CrossFit', titulo: 'Metcon + gimnasia', detalle: 'Sesión propia (hasta 2 h)' },
  { dia: 'Jueves', fecha: '12 nov', tipo: 'Halterofilia', titulo: 'Clase de levantamiento', detalle: 'Técnica de clean & jerk' },
  { dia: 'Viernes', fecha: '13 nov', tipo: 'CrossFit', titulo: 'Fuerza + condición', detalle: 'Sesión propia (hasta 2 h)' },
  { dia: 'Sábado', fecha: '14 nov', tipo: 'Running', titulo: 'Trote largo', detalle: '~10 km' },
  { dia: 'Domingo', fecha: '15 nov', tipo: 'Descanso', titulo: 'Descanso', detalle: 'Recuperación' },
];
