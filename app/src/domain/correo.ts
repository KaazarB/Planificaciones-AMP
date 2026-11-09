// Capa de lógica: enlaces de correo por Gmail en el navegador (no usa el programa de correo del computador)
// y la guía mensual para atletas activos (app en el inicio + importancia del registro).

import { diasEntre, fechaDeMarca } from './fechas';

export function enlaceGmail(para: string, asunto: string, cuerpo: string): string {
  const e = encodeURIComponent;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${e(para)}&su=${e(asunto)}&body=${e(cuerpo)}`;
}

// Cada cuántos días vuelve a aparecer el botón de la guía para un atleta
export const DIAS_ENTRE_GUIAS = 30;

export const asuntoGuia = 'Tu app de entrenamiento: déjala en tu inicio y registra cada sesión';

export const mensajeGuia = (apodo: string, enlace: string): string =>
  `¡Hola ${apodo}! 💪\n\n` +
  'Dos cosas para sacarle el máximo a tu planificación:\n\n' +
  '1) DEJA LA APP EN TU PANTALLA DE INICIO\n' +
  `Link: ${enlace}\n` +
  '• iPhone (Safari): abre el link, toca Compartir (el cuadrado con la flecha hacia arriba) y elige ' +
  '«Agregar a pantalla de inicio» → Agregar.\n' +
  '• Android (Chrome): abre el link, toca ⋮ arriba a la derecha y elige «Agregar a la pantalla principal» ' +
  'o «Instalar app».\n' +
  'Desde ahí la abres como cualquier app. Si te pide entrar, usa tu correo y tu clave.\n\n' +
  '2) REGISTRA CADA SESIÓN\n' +
  '• En la pestaña Plan elige el día y anota por serie los kg, repeticiones o segundos que hiciste ' +
  '(lo gris es lo sugerido).\n' +
  '• Al terminar, completa «Registro al terminar»: esfuerzo de 1 a 10, sueño y notas, incluida cualquier molestia.\n' +
  '• Se guarda solo: fíjate que aparezca «Guardado ✓».\n\n' +
  '¿Por qué importa? Con tu registro veo cómo respondes, ajusto los pesos semana a semana y armo tu ' +
  'próximo bloque con datos reales, no a ojo. Si un día no completas todo, anota lo que sí hiciste: ' +
  'también sirve.\n\n' +
  'Te mando este recordatorio una vez al mes. Cualquier duda, me escribes. ¡Vamos con todo!';

// La guía está pendiente si nunca se envió o si el último envío fue hace 30 días o más
export function guiaPendiente(ultimoEnvio: string | null | undefined, hoy: string): boolean {
  if (!ultimoEnvio) return true;
  return diasEntre(fechaDeMarca(ultimoEnvio), hoy) >= DIAS_ENTRE_GUIAS;
}
