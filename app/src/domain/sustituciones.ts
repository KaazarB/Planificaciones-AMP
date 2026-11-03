// Capa de lógica: alternativas para ejercicios que necesitan una máquina específica.
// Sirven para todos los planes; un ítem del plan puede traer sus propias «alternativas».

import type { Item } from '../data/plan';

import { claveEjercicio } from './videos';

const SUSTITUCIONES: Record<string, string[]> = {
  'prensa de piernas': [
    'Sentadilla goblet con mancuerna',
    'Zancada búlgara con mancuernas',
    'Sentadilla con barra (más liviana)',
  ],
  'extension de cuadriceps': [
    'Sentadilla con talones elevados',
    'Step-up a cajón o banco',
    'Sentadilla española con banda',
  ],
  'curl femoral en maquina': [
    'Peso muerto rumano con mancuernas',
    'Curl femoral deslizando en el suelo',
    'Curl nórdico asistido con banda',
  ],
  'jalon al pecho': ['Dominadas asistidas con banda', 'Remo invertido en barra', 'Pullover con mancuerna'],
  'remo en polea sentado': ['Remo con mancuerna a una mano', 'Remo con barra', 'Remo con banda elástica'],
  'remo en polea sentada': ['Remo con mancuerna a una mano', 'Remo con barra', 'Remo con banda elástica'],
  'extension de triceps en polea': [
    'Extensión de tríceps con mancuerna sobre la cabeza',
    'Fondos en banco',
    'Extensión de tríceps con banda',
  ],
  'face pull': ['Face pull con banda elástica', 'Vuelos posteriores con mancuernas'],
  'patada de gluteo en polea': ['Patada de glúteo con banda', 'Patada de glúteo en 4 apoyos con tobillera'],
  'abduccion de cadera': ['Abducción sentada con banda', 'Monster walk con banda', 'Abducción acostada de lado'],
  'sentadilla hack o goblet': ['Sentadilla goblet con mancuerna', 'Sentadilla frontal con barra'],
  'pallof press en polea': ['Pallof press con banda', 'Plancha con toque de hombro'],
  'pantorrillas de pie': ['Pantorrillas en escalón con mancuerna', 'Pantorrillas a una pierna'],
  'hip thrust con barra': ['Hip thrust con mancuerna', 'Puente de glúteo con banda', 'Hip thrust a una pierna'],
  'hip thrust': ['Hip thrust con mancuerna', 'Puente de glúteo con banda', 'Hip thrust a una pierna'],
  'elevacion de rodillas colgado': ['Elevación de piernas acostado', 'Dead bug'],
};

export function alternativasDe(item: Item): string[] {
  return item.alternativas?.length ? item.alternativas : (SUSTITUCIONES[claveEjercicio(item.nombre)] ?? []);
}
