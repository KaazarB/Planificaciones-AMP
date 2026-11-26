// Capa de servicios: dibuja la imagen (story 1080 × 1920) de un entrenamiento registrado

import type { ResumenHistoria } from '../domain/historia';

export const MARCA = 'PLANIFICACIONES AMP';
export const MARCA_COACH = 'Coach Kaazar';

const ANCHO = 1080;
const ALTO = 1920;
const MARGEN = 96;
const VERDE = '#22c55e';
const LIMA = '#a3e635';
const GRIS = '#9a9a9a';
const TITULAR = "'Bebas Neue', Impact, sans-serif";
const TEXTO = "-apple-system, 'Helvetica Neue', Arial, sans-serif";

const miles = (n: number) => n.toLocaleString('es-CL');
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// Corta el texto en líneas que quepan en el ancho (con «…» si sobra)
function envolver(ctx: CanvasRenderingContext2D, texto: string, ancho: number, maxLineas: number): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = p;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length <= maxLineas) return lineas;
  const visibles = lineas.slice(0, maxLineas);
  let ultima = visibles[maxLineas - 1];
  while (ultima.length > 1 && ctx.measureText(`${ultima}…`).width > ancho) ultima = ultima.slice(0, -1);
  visibles[maxLineas - 1] = `${ultima.trimEnd()}…`;
  return visibles;
}

function recortar(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string {
  return envolver(ctx, texto, ancho, 1)[0] ?? '';
}

function datos(r: ResumenHistoria): { valor: string; etiqueta: string }[] {
  const d: { valor: string; etiqueta: string }[] = [];
  if (r.series) d.push({ valor: String(r.series), etiqueta: r.series === 1 ? 'SERIE' : 'SERIES' });
  if (r.tonelaje) d.push({ valor: miles(r.tonelaje), etiqueta: 'KG MOVIDOS' });
  if (r.minutos) d.push({ valor: String(r.minutos), etiqueta: 'MINUTOS' });
  if (r.rpe !== null) d.push({ valor: `${r.rpe}/10`, etiqueta: 'ESFUERZO' });
  return d.slice(0, 3);
}

export function dibujarHistoria(ctx: CanvasRenderingContext2D, r: ResumenHistoria): void {
  const util = ANCHO - MARGEN * 2;

  // Fondo negro con un brillo verde arriba
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  const brillo = ctx.createRadialGradient(ANCHO * 0.85, 120, 40, ANCHO * 0.85, 120, 900);
  brillo.addColorStop(0, 'rgba(34, 197, 94, 0.35)');
  brillo.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Cabecera (debajo de la zona que tapa Instagram arriba)
  let y = 300;
  ctx.fillStyle = VERDE;
  ctx.font = `56px ${TITULAR}`;
  ctx.fillText('ENTRENAMIENTO COMPLETADO', MARGEN, y);

  y += 150;
  ctx.fillStyle = '#ffffff';
  ctx.font = `170px ${TITULAR}`;
  ctx.fillText(recortar(ctx, r.apodo.toUpperCase(), util), MARGEN, y);

  y += 70;
  ctx.fillStyle = GRIS;
  ctx.font = `500 42px ${TEXTO}`;
  ctx.fillText(mayuscula(r.fecha), MARGEN, y);

  y += 50;
  ctx.fillStyle = VERDE;
  ctx.fillRect(MARGEN, y, 140, 10);

  // Título de la sesión (hasta 2 líneas)
  ctx.fillStyle = '#ffffff';
  ctx.font = `96px ${TITULAR}`;
  for (const linea of envolver(ctx, r.titulo.toUpperCase(), util, 2)) {
    y += 100;
    ctx.fillText(linea, MARGEN, y);
  }

  // Datos de la sesión en tarjetas
  const tarjetas = datos(r);
  if (tarjetas.length) {
    y += 60;
    const hueco = 24;
    const ancho = (util - hueco * (tarjetas.length - 1)) / tarjetas.length;
    tarjetas.forEach((t, i) => {
      const x = MARGEN + i * (ancho + hueco);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, ancho, 190, 28);
      else ctx.rect(x, y, ancho, 190); // iPhone con iOS antiguo
      ctx.fill();
      ctx.fillStyle = LIMA;
      ctx.font = `96px ${TITULAR}`;
      ctx.fillText(recortar(ctx, t.valor, ancho - 56), x + 30, y + 112);
      ctx.fillStyle = GRIS;
      ctx.font = `600 28px ${TEXTO}`;
      ctx.fillText(t.etiqueta, x + 30, y + 158);
    });
    y += 190;
  }

  // Ejercicios destacados: nombre a la izquierda y mejor serie a la derecha
  y += 30;
  const limite = 1590; // la zona de abajo la tapa la barra de respuesta de Instagram
  const alto = 86;
  let mostrados = 0;
  for (const l of r.lineas) {
    if (y + alto > limite) break;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(MARGEN, y, util, 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = VERDE;
    ctx.font = `600 36px ${TEXTO}`;
    const detalle = recortar(ctx, l.detalle, util * 0.5);
    ctx.fillText(detalle, ANCHO - MARGEN, y + 57);
    const anchoDetalle = ctx.measureText(detalle).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 38px ${TEXTO}`;
    ctx.fillText(recortar(ctx, l.nombre, util - anchoDetalle - 32), MARGEN, y + 57);
    y += alto;
    mostrados += 1;
  }
  const sobran = r.masEjercicios + r.lineas.length - mostrados;
  if (sobran > 0 && y + 60 <= limite + 20) {
    y += 52;
    ctx.fillStyle = GRIS;
    ctx.font = `500 34px ${TEXTO}`;
    ctx.fillText(`+ ${sobran} ${sobran === 1 ? 'ejercicio más' : 'ejercicios más'}`, MARGEN, y);
  }

  // Marca
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(MARGEN, 1620, util, 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `64px ${TITULAR}`;
  ctx.fillText(MARCA, MARGEN, 1700);
  ctx.fillStyle = VERDE;
  ctx.font = `600 34px ${TEXTO}`;
  ctx.fillText(MARCA_COACH, MARGEN, 1748);
}

// Imagen lista para compartir (PNG)
export async function crearImagenHistoria(r: ResumenHistoria): Promise<File> {
  try {
    await Promise.all([document.fonts.load(`96px 'Bebas Neue'`), document.fonts.ready]);
  } catch {
    /* sin la fuente se usa Impact */
  }
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('Tu teléfono no pudo crear la imagen.');
  dibujarHistoria(ctx, r);
  const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/png'));
  if (!blob) throw new Error('Tu teléfono no pudo crear la imagen.');
  const nombre = `entrenamiento-${r.apodo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}.png`;
  return new File([blob], nombre, { type: 'image/png' });
}
