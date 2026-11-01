// Capa de datos: modelo de una sesión y la planificación
// El id de cada sesión es su fecha (AAAA-MM-DD), así cada día tiene su propio registro

export type TipoSesion = 'CrossFit' | 'Halterofilia' | 'Running' | 'Descanso';

export interface Bloque {
  nombre: string;
  contenido: string[];
}

export interface Sesion {
  id: string;
  dia: string;
  fecha: string;
  tipo: TipoSesion;
  titulo: string;
  detalle: string;
  bloques: Bloque[];
}

export const planificacion: Sesion[] = [
  // ===== Semana 1: 9 al 15 de noviembre =====
  {
    id: '2026-11-09',
    dia: 'Lunes',
    fecha: '9 nov',
    tipo: 'CrossFit',
    titulo: 'Fuerza + gimnasia',
    detalle: 'Sesión propia (hasta 2 h)',
    bloques: [
      { nombre: 'Calentamiento', contenido: ['10 min movilidad de cadera y hombros', '3 rondas: 10 PVC pass-through, 10 air squats, 5 inchworms'] },
      { nombre: 'Fuerza', contenido: ['Back squat 5x5 al 75% (~112 kg)', 'Descanso 2 min entre series'] },
      { nombre: 'Gimnasia', contenido: ['EMOM 10 min: 5 chest to bar controlados'] },
      { nombre: 'Metcon', contenido: ['AMRAP 12 min:', '10 wall balls', '8 toes to bar', '12 cal row'] },
    ],
  },
  {
    id: '2026-11-10',
    dia: 'Martes',
    fecha: '10 nov',
    tipo: 'Halterofilia',
    titulo: 'Clase de levantamiento',
    detalle: 'Técnica de snatch',
    bloques: [
      { nombre: 'Clase', contenido: ['Técnica de snatch según el coach', 'Anotar cargas y sensaciones al terminar'] },
    ],
  },
  {
    id: '2026-11-11',
    dia: 'Miércoles',
    fecha: '11 nov',
    tipo: 'CrossFit',
    titulo: 'Metcon + gimnasia',
    detalle: 'Sesión propia (hasta 2 h)',
    bloques: [
      { nombre: 'Calentamiento', contenido: ['10 min bike suave', 'Activación escapular: 3x10 scap pull-ups'] },
      { nombre: 'Gimnasia', contenido: ['Ring muscle-up: 5x3 transiciones con anillas bajas', 'Pull-ups butterfly: 5x6 controladas'] },
      { nombre: 'Metcon', contenido: ['3 rondas por tiempo:', '15 cal bike', '12 burpees over bar', '9 chest to bar'] },
    ],
  },
  {
    id: '2026-11-12',
    dia: 'Jueves',
    fecha: '12 nov',
    tipo: 'Halterofilia',
    titulo: 'Clase de levantamiento',
    detalle: 'Técnica de clean & jerk',
    bloques: [
      { nombre: 'Clase', contenido: ['Técnica de clean & jerk según el coach', 'Anotar cargas y sensaciones al terminar'] },
    ],
  },
  {
    id: '2026-11-13',
    dia: 'Viernes',
    fecha: '13 nov',
    tipo: 'CrossFit',
    titulo: 'Fuerza + condición',
    detalle: 'Sesión propia (hasta 2 h)',
    bloques: [
      { nombre: 'Calentamiento', contenido: ['10 min row suave + movilidad de muñecas y tobillos'] },
      { nombre: 'Fuerza', contenido: ['Front squat 4x4 al 78% (~94 kg)', 'Strict press 4x6 al 70% (~49 kg)'] },
      { nombre: 'Metcon', contenido: ['5 rondas:', '500 m row', '10 thrusters 43 kg', 'Descanso 1 min entre rondas'] },
    ],
  },
  {
    id: '2026-11-14',
    dia: 'Sábado',
    fecha: '14 nov',
    tipo: 'Running',
    titulo: 'Trote largo',
    detalle: '~10 km',
    bloques: [
      { nombre: 'Carrera', contenido: ['10 km a ritmo cómodo', 'Anotar tiempo total y sensaciones'] },
    ],
  },
  {
    id: '2026-11-15',
    dia: 'Domingo',
    fecha: '15 nov',
    tipo: 'Descanso',
    titulo: 'Descanso',
    detalle: 'Recuperación',
    bloques: [
      { nombre: 'Recuperación', contenido: ['Día libre', 'Opcional: 15 min de movilidad suave'] },
    ],
  },
];