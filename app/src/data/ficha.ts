// Capa de datos: preguntas de la ficha de inscripción (se dibujan solas desde esta lista)
// Para agregar o quitar una pregunta basta con editar este archivo.

export type TipoCampo = 'texto' | 'numero' | 'area' | 'opciones' | 'multi' | 'check';

export interface CampoFicha {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones?: string[];
  ayuda?: string;
  unidad?: string;
  requerido?: boolean;
}

export interface PasoFicha {
  titulo: string;
  descripcion?: string;
  campos: CampoFicha[];
}

export type DatosFicha = Record<string, string | string[] | boolean>;

export const pasosFicha: PasoFicha[] = [
  {
    titulo: 'Sobre ti',
    campos: [
      { clave: 'edad', etiqueta: 'Edad', tipo: 'numero', unidad: 'años', requerido: true },
      { clave: 'sexo', etiqueta: 'Sexo', tipo: 'opciones', opciones: ['Femenino', 'Masculino', 'Prefiero no decir'] },
      { clave: 'peso', etiqueta: 'Peso', tipo: 'numero', unidad: 'kg', requerido: true },
      { clave: 'estatura', etiqueta: 'Estatura', tipo: 'numero', unidad: 'cm' },
      {
        clave: 'whatsapp',
        etiqueta: 'WhatsApp',
        tipo: 'texto',
        ayuda: 'Para coordinar la evaluación',
        requerido: true,
      },
      { clave: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto' },
    ],
  },
  {
    titulo: 'Tu objetivo',
    campos: [
      {
        clave: 'objetivo',
        etiqueta: 'Objetivo principal',
        tipo: 'opciones',
        requerido: true,
        opciones: [
          'Salud y bienestar',
          'Estética / ganar masa muscular',
          'Ganar fuerza',
          'Empezar CrossFit',
          'Competir en CrossFit',
          'Carrera / resistencia',
        ],
      },
      { clave: 'objetivo_secundario', etiqueta: 'Objetivo secundario', tipo: 'texto' },
      {
        clave: 'evento',
        etiqueta: '¿Tienes una fecha o evento en mente?',
        tipo: 'texto',
        ayuda: 'Ej. Open 2027, una carrera de 10 km en abril',
      },
    ],
  },
  {
    titulo: 'Tu experiencia',
    campos: [
      {
        clave: 'anos',
        etiqueta: 'Años entrenando',
        tipo: 'opciones',
        requerido: true,
        opciones: ['Menos de 1', '1 a 2', '3 a 5', 'Más de 5'],
      },
      {
        clave: 'tipo_entrenamiento',
        etiqueta: '¿Qué has entrenado?',
        tipo: 'multi',
        opciones: ['Gimnasio', 'CrossFit', 'Halterofilia', 'Running', 'Otro deporte'],
      },
      { clave: 'nivel', etiqueta: 'Tu nivel', tipo: 'opciones', opciones: ['Principiante', 'Intermedio', 'Avanzado'] },
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
    ],
  },
  {
    titulo: 'Tus marcas',
    descripcion: 'Opcional: completa solo las que sepas. Si no, las medimos en la semana de evaluación.',
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
  {
    titulo: 'Tu tiempo',
    campos: [
      {
        clave: 'dias',
        etiqueta: 'Días por semana para entrenar',
        tipo: 'opciones',
        requerido: true,
        opciones: ['2', '3', '4', '5', '6'],
      },
      {
        clave: 'duracion',
        etiqueta: 'Duración de cada sesión',
        tipo: 'opciones',
        requerido: true,
        opciones: ['45 min', '60 min', '75 min', '90 min o más'],
      },
      {
        clave: 'ocupados',
        etiqueta: 'Días u horarios ya ocupados',
        tipo: 'texto',
        ayuda: 'Ej. clases el martes y jueves, fútbol el sábado',
      },
      { clave: 'viajes', etiqueta: 'Viajes próximos', tipo: 'texto' },
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
        opciones: ['Box de CrossFit', 'Gimnasio comercial', 'Gimnasio del edificio', 'Casa'],
      },
      {
        clave: 'equipamiento',
        etiqueta: 'Equipamiento disponible',
        tipo: 'multi',
        opciones: [
          'Barra y discos',
          'Rack',
          'Mancuernas',
          'Kettlebells',
          'Poleas / máquinas',
          'Barra de dominadas',
          'Anillas',
          'Remo',
          'Bike',
          'Ski',
          'Cuerda',
          'Cajón',
          'Balón medicinal',
        ],
      },
    ],
  },
  {
    titulo: 'Salud y día a día',
    descripcion: 'Esta información solo la vemos tú y tu coach.',
    campos: [
      { clave: 'lesiones', etiqueta: 'Lesiones actuales o pasadas, molestias', tipo: 'area' },
      { clave: 'condiciones', etiqueta: 'Condiciones médicas relevantes', tipo: 'area' },
      {
        clave: 'autorizacion',
        etiqueta: '¿Tienes autorización médica para entrenar?',
        tipo: 'opciones',
        opciones: ['Sí', 'No', 'No la he necesitado'],
      },
      {
        clave: 'sueno',
        etiqueta: 'Horas de sueño',
        tipo: 'opciones',
        opciones: ['Menos de 6', '6 a 7', '7 a 8', 'Más de 8'],
      },
      { clave: 'estres', etiqueta: 'Nivel de estrés', tipo: 'opciones', opciones: ['Bajo', 'Medio', 'Alto'] },
      { clave: 'trabajo', etiqueta: 'Tu trabajo es', tipo: 'opciones', opciones: ['Sentado', 'De pie', 'Físico'] },
    ],
  },
  {
    titulo: 'Último paso',
    campos: [
      { clave: 'gusta', etiqueta: 'Ejercicios que te gustan', tipo: 'texto' },
      { clave: 'no_gusta', etiqueta: 'Ejercicios que prefieres evitar', tipo: 'texto' },
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

export function faltantes(paso: PasoFicha, datos: DatosFicha): string[] {
  return paso.campos
    .filter((c) => c.requerido)
    .filter((c) => {
      const v = datos[c.clave];
      return v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0);
    })
    .map((c) => c.etiqueta);
}
