// Capa de datos: preguntas de la ficha de inscripción (se dibujan solas desde esta lista)
// La primera pregunta («deporte») decide qué pasos y preguntas ve cada persona.
// Para agregar o quitar una pregunta basta con editar este archivo.

export type TipoCampo = 'texto' | 'numero' | 'area' | 'opciones' | 'multi' | 'check' | 'tarjetas' | 'fecha';

export type DatosFicha = Record<string, string | string[] | boolean>;

export interface CampoFicha {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones?: string[];
  descripciones?: Record<string, string>; // solo para «tarjetas»
  ayuda?: string;
  unidad?: string;
  requerido?: boolean;
  exclusiva?: string; // en «multi»: opción que no se combina con las demás (ej. «Ninguno»)
  mostrarSi?: (d: DatosFicha) => boolean;
}

export interface PasoFicha {
  titulo: string;
  descripcion?: string;
  campos: CampoFicha[];
  mostrarSi?: (d: DatosFicha) => boolean;
}

// La primera pregunta es el deporte (puede elegir varios); de ahí salen los caminos
export const CROSSFIT = 'CrossFit';
export const GIMNASIO = 'Gimnasio';
export const NINGUNO = 'Ninguno todavía';
const NINGUNO_ANTES = 'Ninguno, solo quiero entrenar';
const DEPORTES = [
  CROSSFIT,
  GIMNASIO,
  'Fútbol',
  'Running',
  'Ciclismo',
  'Pádel / tenis',
  'Básquetbol',
  'Vóleibol',
  'Natación',
  'Artes marciales',
  'Otro',
  NINGUNO,
];
// Nombres de versiones anteriores (fichas ya enviadas con «enfoque»)
const ENFOQUE_DEPORTE = ['Fuerza para mi deporte', 'Rendimiento en mi deporte'];
const ENFOQUE_SALUD = ['Fuerza y forma física', 'Salud y forma física'];

// «deporte» era un texto en fichas antiguas y ahora es una lista
export const deportesDe = (d: DatosFicha): string[] =>
  Array.isArray(d.deporte) ? d.deporte : typeof d.deporte === 'string' && d.deporte ? [d.deporte] : [];
const SIN_DEPORTE = [CROSSFIT, GIMNASIO, NINGUNO, NINGUNO_ANTES];

const esCrossfit = (d: DatosFicha): boolean => deportesDe(d).includes(CROSSFIT) || d.enfoque === CROSSFIT;
// Practica al menos un deporte distinto de CrossFit y gimnasio → plan de fuerza para su deporte
const esDeporte = (d: DatosFicha): boolean =>
  deportesDe(d).some((x) => !SIN_DEPORTE.includes(x)) || ENFOQUE_DEPORTE.includes(String(d.enfoque));
// Solo gimnasio o ninguno (o fichas antiguas sin camino) → fuerza y forma física
const esSalud = (d: DatosFicha): boolean => {
  if (d.enfoque) return ENFOQUE_SALUD.includes(String(d.enfoque));
  const lista = deportesDe(d);
  return !lista.length || lista.every((x) => x === GIMNASIO || x === NINGUNO || x === NINGUNO_ANTES);
};

export const pasosFicha: PasoFicha[] = [
  {
    titulo: 'Tu deporte',
    descripcion: 'Así adaptamos las preguntas y tu plan a lo que haces.',
    campos: [
      {
        clave: 'deporte',
        etiqueta: '¿Qué deportes o actividades practicas?',
        tipo: 'multi',
        requerido: true,
        ayuda: 'Puedes elegir más de uno.',
        opciones: DEPORTES,
        exclusiva: NINGUNO,
      },
      {
        clave: 'deporte_otro',
        etiqueta: '¿Cuál?',
        tipo: 'texto',
        requerido: true,
        mostrarSi: (d) => deportesDe(d).includes('Otro'),
      },
    ],
  },
  {
    titulo: 'Sobre ti',
    campos: [
      { clave: 'edad', etiqueta: 'Edad', tipo: 'numero', unidad: 'años', requerido: true },
      { clave: 'sexo', etiqueta: 'Sexo', tipo: 'opciones', opciones: ['Femenino', 'Masculino', 'Prefiero no decir'] },
      { clave: 'peso', etiqueta: 'Peso', tipo: 'numero', unidad: 'kg', requerido: true },
      { clave: 'estatura', etiqueta: 'Estatura', tipo: 'numero', unidad: 'cm' },
      { clave: 'whatsapp', etiqueta: 'WhatsApp', tipo: 'texto', ayuda: 'Para coordinar contigo', requerido: true },
      { clave: 'ciudad', etiqueta: 'Ciudad o comuna', tipo: 'texto' },
    ],
  },

  // ---------- Camino: otro deporte (plan de fuerza para complementarlo) ----------
  {
    titulo: 'Sobre tu deporte',
    mostrarSi: esDeporte,
    campos: [
      {
        clave: 'posicion',
        etiqueta: 'Posición, prueba o distancia',
        tipo: 'texto',
        ayuda: 'Opcional. Ej. delantero, 10K, ruta, arquero',
      },
      {
        clave: 'nivel_deporte',
        etiqueta: '¿A qué nivel practicas tu deporte principal?',
        tipo: 'opciones',
        requerido: true,
        opciones: ['Por diversión', 'Liga o competencias amateur', 'Club o federado'],
      },
      {
        clave: 'temporada',
        etiqueta: '¿En qué momento estás?',
        tipo: 'opciones',
        opciones: ['Fuera de temporada', 'Preparando la temporada', 'En plena temporada'],
      },
      {
        clave: 'dias_deporte',
        etiqueta: '¿Cuántos días a la semana entrenas o juegas tu deporte?',
        tipo: 'opciones',
        opciones: ['1', '2', '3', '4', '5 o más'],
      },
      {
        clave: 'mejorar',
        etiqueta: '¿Qué te gustaría mejorar?',
        tipo: 'multi',
        requerido: true,
        opciones: [
          'Fuerza',
          'Velocidad',
          'Resistencia',
          'Salto / potencia',
          'Agilidad',
          'Movilidad',
          'Prevenir lesiones',
          'Ganar músculo',
          'Bajar de peso',
        ],
      },
    ],
  },

  // ---------- Camino: sin deporte (fuerza y forma física) ----------
  {
    titulo: 'Tu objetivo',
    mostrarSi: esSalud,
    campos: [
      {
        clave: 'objetivo',
        etiqueta: '¿Qué es lo más importante para ti?',
        tipo: 'opciones',
        requerido: true,
        opciones: [
          'Salud y bienestar',
          'Bajar de peso',
          'Ganar masa muscular',
          'Tonificar',
          'Más energía y menos dolores',
          'Crear el hábito de entrenar',
          'Prepararme para empezar CrossFit',
        ],
      },
      { clave: 'objetivo_secundario', etiqueta: '¿Algo más que quieras lograr?', tipo: 'texto' },
      {
        clave: 'fecha_meta',
        etiqueta: '¿Tienes una fecha en mente?',
        tipo: 'texto',
        ayuda: 'Opcional. Ej. un viaje, un matrimonio, el verano',
      },
    ],
  },

  // ---------- Camino: CrossFit ----------
  {
    titulo: 'Tu CrossFit',
    mostrarSi: esCrossfit,
    campos: [
      {
        clave: 'anos_cf',
        etiqueta: '¿Hace cuánto practicas CrossFit?',
        tipo: 'opciones',
        requerido: true,
        opciones: ['Menos de 6 meses', '6 meses a 1 año', '1 a 3 años', 'Más de 3 años'],
      },
      {
        clave: 'objetivo_cf',
        etiqueta: '¿Qué quieres lograr?',
        tipo: 'opciones',
        requerido: true,
        opciones: ['Aprender bien la técnica', 'Mejorar mi nivel', 'Competir'],
      },
      {
        clave: 'movimientos',
        etiqueta: 'Movimientos que dominas',
        tipo: 'multi',
        opciones: [
          'Sentadilla',
          'Peso muerto',
          'Press',
          'Clean',
          'Snatch',
          'Dominadas',
          'Toes-to-bar',
          'Double unders',
          'Muscle-up',
          'Handstand push-up',
        ],
      },
      {
        clave: 'debilidades',
        etiqueta: '¿Qué te cuesta más?',
        tipo: 'texto',
        ayuda: 'Ej. gimnásticos, olímpicos, motor, movilidad',
      },
    ],
  },
  {
    titulo: 'Tus marcas',
    descripcion: 'Opcional: completa solo las que sepas. Si no, las medimos juntos.',
    mostrarSi: esCrossfit,
    campos: [
      { clave: 'back_squat', etiqueta: 'Back squat (1RM)', tipo: 'numero', unidad: 'kg' },
      { clave: 'front_squat', etiqueta: 'Front squat (1RM)', tipo: 'numero', unidad: 'kg' },
      { clave: 'peso_muerto', etiqueta: 'Peso muerto (1RM)', tipo: 'numero', unidad: 'kg' },
      { clave: 'strict_press', etiqueta: 'Strict press (1RM)', tipo: 'numero', unidad: 'kg' },
      { clave: 'clean_and_jerk', etiqueta: 'Clean & jerk (1RM)', tipo: 'numero', unidad: 'kg' },
      { clave: 'snatch', etiqueta: 'Snatch (1RM)', tipo: 'numero', unidad: 'kg' },
      { clave: 'cinco_km', etiqueta: 'Tiempo en 5 km', tipo: 'texto', ayuda: 'Ej. 24:30' },
      { clave: 'benchmark', etiqueta: 'Algún benchmark', tipo: 'texto', ayuda: 'Ej. Fran 6:40' },
    ],
  },

  // ---------- Común a todos ----------
  {
    titulo: 'Tu evento',
    descripcion: 'Si tienes una carrera, competencia o evento, armamos tu plan para llegar en tu mejor momento.',
    campos: [
      {
        clave: 'tiene_evento',
        etiqueta: '¿Tienes algún evento deportivo en el que quieras participar o competir?',
        tipo: 'opciones',
        requerido: true,
        opciones: ['Sí', 'No'],
      },
      {
        clave: 'evento',
        etiqueta: '¿Cuál es el evento?',
        tipo: 'texto',
        requerido: true,
        ayuda: 'Ej. Maratón de Santiago, Open 2027, triatlón, campeonato de fútbol, una corrida de 10K',
        mostrarSi: (d) => d.tiene_evento === 'Sí',
      },
      {
        clave: 'fecha_evento',
        etiqueta: '¿Cuándo es?',
        tipo: 'fecha',
        requerido: true,
        mostrarSi: (d) => d.tiene_evento === 'Sí',
      },
      {
        clave: 'meta_evento',
        etiqueta: '¿Qué quieres lograr ahí?',
        tipo: 'opciones',
        requerido: true,
        opciones: ['Participar y terminarlo', 'Mejorar mi marca', 'Competir por un buen resultado'],
        mostrarSi: (d) => d.tiene_evento === 'Sí',
      },
      {
        clave: 'marca_evento',
        etiqueta: '¿Tienes una marca o meta concreta?',
        tipo: 'texto',
        ayuda: 'Opcional. Ej. bajar de 50 min en 10K, quedar entre los 20 primeros',
        mostrarSi: (d) => d.tiene_evento === 'Sí' && d.meta_evento !== 'Participar y terminarlo',
      },
    ],
  },
  {
    titulo: 'Tu experiencia',
    campos: [
      {
        clave: 'anos',
        etiqueta: '¿Hace cuánto entrenas con pesas o en gimnasio?',
        tipo: 'opciones',
        requerido: true,
        opciones: ['Nunca he entrenado', 'Menos de 1 año', '1 a 2 años', '3 a 5 años', 'Más de 5 años'],
      },
      {
        clave: 'nivel',
        etiqueta: '¿Cómo te sientes entrenando?',
        tipo: 'opciones',
        opciones: ['Estoy empezando', 'Me defiendo bien', 'Tengo mucha experiencia'],
      },
      {
        clave: 'tipo_entrenamiento',
        etiqueta: '¿Qué has hecho antes?',
        tipo: 'multi',
        mostrarSi: (d) => !esCrossfit(d),
        opciones: ['Gimnasio', 'Clases (funcional, spinning…)', 'Running', 'Otro deporte', 'Nada todavía'],
      },
      {
        clave: 'peso_cargas',
        etiqueta: 'Si entrenas con pesas, ¿con cuánto haces sentadilla o prensa?',
        tipo: 'texto',
        ayuda: 'Opcional y aproximado. Ej. sentadilla 60 kg × 8',
        mostrarSi: (d) => !esCrossfit(d),
      },
    ],
  },
  {
    titulo: 'Tu tiempo',
    campos: [
      {
        clave: 'inicio',
        etiqueta: '¿Desde cuándo quieres empezar?',
        tipo: 'fecha',
        requerido: true,
        ayuda: 'Los planes parten un lunes: si eliges otro día, partimos el lunes siguiente.',
      },
      {
        clave: 'dias',
        etiqueta: '¿Cuántos días a la semana puedes entrenar con el plan?',
        tipo: 'opciones',
        requerido: true,
        opciones: ['2', '3', '4', '5', '6'],
      },
      {
        clave: 'duracion',
        etiqueta: '¿Cuánto tiempo por sesión?',
        tipo: 'opciones',
        requerido: true,
        opciones: ['30 min', '45 min', '60 min', '75 min', '90 min o más'],
      },
      {
        clave: 'ocupados',
        etiqueta: '¿Qué días u horarios ya tienes ocupados?',
        tipo: 'texto',
        ayuda: 'Ej. partido el sábado, clases martes y jueves',
      },
      { clave: 'viajes', etiqueta: '¿Viajes próximos?', tipo: 'texto' },
    ],
  },
  {
    titulo: 'Dónde entrenas',
    campos: [
      {
        clave: 'lugar',
        etiqueta: 'Lugar',
        tipo: 'opciones',
        requerido: true,
        opciones: ['Gimnasio', 'Box de CrossFit', 'Gimnasio del edificio', 'Casa', 'Plaza o al aire libre'],
      },
      {
        clave: 'equipamiento',
        etiqueta: '¿Qué tienes disponible?',
        tipo: 'multi',
        ayuda: 'Marca lo que tengas. Si no tienes nada, no marques nada.',
        opciones: [
          'Barra y discos',
          'Rack',
          'Mancuernas',
          'Kettlebells',
          'Máquinas / poleas',
          'Barra de dominadas',
          'Bandas elásticas',
          'Anillas',
          'Remo / bike',
          'Cuerda',
          'Cajón o escalón',
          'Balón medicinal',
        ],
      },
    ],
  },
  {
    titulo: 'Salud y día a día',
    descripcion: 'Esta información solo la vemos tú y tu coach.',
    campos: [
      { clave: 'lesiones', etiqueta: '¿Lesiones o molestias, actuales o pasadas?', tipo: 'area' },
      { clave: 'condiciones', etiqueta: '¿Alguna condición médica? (asma, presión, etc.)', tipo: 'area' },
      {
        clave: 'autorizacion',
        etiqueta: '¿Tienes autorización médica para entrenar?',
        tipo: 'opciones',
        opciones: ['Sí', 'No', 'No la he necesitado'],
      },
      {
        clave: 'sueno',
        etiqueta: '¿Cuántas horas duermes?',
        tipo: 'opciones',
        opciones: ['Menos de 6', '6 a 7', '7 a 8', 'Más de 8'],
      },
      { clave: 'estres', etiqueta: 'Tu nivel de estrés', tipo: 'opciones', opciones: ['Bajo', 'Medio', 'Alto'] },
      {
        clave: 'trabajo',
        etiqueta: 'En tu trabajo o estudio pasas…',
        tipo: 'opciones',
        opciones: ['Sentado', 'De pie', 'Haciendo esfuerzo físico'],
      },
    ],
  },
  {
    titulo: 'Último paso',
    campos: [
      { clave: 'gusta', etiqueta: 'Ejercicios o actividades que te gustan', tipo: 'texto', ayuda: 'Opcional' },
      { clave: 'no_gusta', etiqueta: 'Ejercicios que prefieres evitar', tipo: 'texto', ayuda: 'Opcional' },
      { clave: 'comentarios', etiqueta: '¿Algo más que tu coach deba saber?', tipo: 'area' },
      {
        clave: 'consentimiento',
        etiqueta: 'Acepto que mi coach use estos datos solo para armar y ajustar mi planificación.',
        tipo: 'check',
        requerido: true,
      },
    ],
  },
];

const visible = (x: { mostrarSi?: (d: DatosFicha) => boolean }, d: DatosFicha) => !x.mostrarSi || x.mostrarSi(d);

// Pasos y preguntas que le tocan a esta persona según sus respuestas
export function pasosVisibles(d: DatosFicha): PasoFicha[] {
  return pasosFicha
    .filter((p) => visible(p, d))
    .map((p) => ({ ...p, campos: p.campos.filter((c) => visible(c, d)) }))
    .filter((p) => p.campos.length);
}

// Quita las respuestas de caminos que la persona ya no eligió (si cambió de enfoque)
export function limpiarFicha(d: DatosFicha): DatosFicha {
  const claves = new Set(pasosVisibles(d).flatMap((p) => p.campos.map((c) => c.clave)));
  return Object.fromEntries(Object.entries(d).filter(([k]) => claves.has(k)));
}

export function faltantes(paso: PasoFicha, datos: DatosFicha): string[] {
  return paso.campos
    .filter((c) => c.requerido)
    .filter((c) => {
      const v = datos[c.clave];
      return v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0);
    })
    .map((c) => c.etiqueta);
}
