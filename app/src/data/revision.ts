// Capa de datos: preguntas de la revisión de fin de bloque (antes de armar el siguiente)

import type { CampoFicha, DatosFicha } from './ficha';

export const DIAS_REVISION = 10; // se le pide al atleta cuando faltan 10 días o menos

const conMolestia = (d: DatosFicha): boolean => d.molestia === 'Sí';

export const camposRevision: CampoFicha[] = [
  {
    clave: 'sensacion',
    etiqueta: '¿Cómo sentiste este bloque?',
    tipo: 'opciones',
    requerido: true,
    opciones: ['Muy fácil', 'Bien', 'Exigente, pero bien', 'Demasiado'],
  },
  {
    clave: 'objetivo_igual',
    etiqueta: '¿Tu objetivo sigue siendo el mismo?',
    tipo: 'opciones',
    requerido: true,
    opciones: ['Sí, sigue igual', 'Quiero cambiarlo'],
  },
  {
    clave: 'objetivo_nuevo',
    etiqueta: '¿Qué te gustaría lograr ahora?',
    tipo: 'area',
    requerido: true,
    mostrarSi: (d) => d.objetivo_igual === 'Quiero cambiarlo',
  },
  {
    clave: 'molestia',
    etiqueta: '¿Tienes alguna molestia o dolor?',
    tipo: 'opciones',
    requerido: true,
    opciones: ['No', 'Sí'],
  },
  {
    clave: 'zonas',
    etiqueta: '¿Dónde?',
    tipo: 'multi',
    requerido: true,
    mostrarSi: conMolestia,
    opciones: [
      'Cuello',
      'Hombro',
      'Codo',
      'Muñeca',
      'Espalda alta',
      'Espalda baja',
      'Cadera',
      'Rodilla',
      'Tobillo / pie',
      'Otra',
    ],
  },
  {
    clave: 'molestia_nivel',
    etiqueta: '¿Qué tan fuerte?',
    tipo: 'opciones',
    requerido: true,
    mostrarSi: conMolestia,
    opciones: ['Leve (1-3)', 'Moderada (4-6)', 'Fuerte (7-10)'],
    ayuda: 'Si es fuerte, no esperes al próximo bloque: avísale a tu coach y consulta a un kinesiólogo o médico.',
  },
  {
    clave: 'molestia_detalle',
    etiqueta: '¿Cuándo aparece y qué ejercicios la empeoran?',
    tipo: 'area',
    mostrarSi: conMolestia,
  },
  {
    clave: 'disponibilidad',
    etiqueta: '¿Cambia tu disponibilidad para el próximo bloque?',
    tipo: 'opciones',
    requerido: true,
    opciones: ['Sin cambios', 'Puedo entrenar más días', 'Puedo entrenar menos días'],
  },
  {
    clave: 'disponibilidad_detalle',
    etiqueta: '¿Cuántos días y cuáles?',
    tipo: 'texto',
    mostrarSi: (d) => Boolean(d.disponibilidad) && d.disponibilidad !== 'Sin cambios',
  },
  { clave: 'ejercicios', etiqueta: '¿Algún ejercicio que te gustó o que no te acomodó?', tipo: 'texto' },
  { clave: 'comentarios', etiqueta: '¿Algo más que deba saber tu coach?', tipo: 'area' },
];

export const camposVisibles = (d: DatosFicha): CampoFicha[] =>
  camposRevision.filter((c) => !c.mostrarSi || c.mostrarSi(d));
