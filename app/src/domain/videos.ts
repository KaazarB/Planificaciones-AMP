// Capa de lógica: relacionar ejercicios con videos de YouTube

// Nombre comparable: sin tildes, sin mayúsculas, sin lo que va entre paréntesis
// ("Wall balls (9 kg a 3 m)" y "wall balls" quedan iguales)
export function claveEjercicio(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrae el id del video desde cualquier formato de link de YouTube
export function idYoutube(url: string): string | null {
  const limpio = url.trim();
  const patrones = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?[^#]*v=([\w-]{11})/,
    /youtube\.com\/(?:shorts|embed|live)\/([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const p of patrones) {
    const m = limpio.match(p);
    if (m) return m[1];
  }
  return null;
}

// Segundo de inicio si el link trae ?t=90 o &t=1m30s
export function inicioYoutube(url: string): number {
  const m = url.match(/[?&]t=(?:(\d+)m)?(\d+)s?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}
