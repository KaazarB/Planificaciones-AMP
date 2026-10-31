// Capa de datos: cómo se ve un registro de entrenamiento

export type Sensacion = 'Muy mal' | 'Mal' | 'Normal' | 'Bien' | 'Excelente';

export interface Registro {
  sesionId: string;
  resultado: string;
  rpe: number;
  sensacion: Sensacion;
  comentario: string;
  fecha: string;
}
