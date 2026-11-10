// Plugin de compilación: conserva los archivos de las últimas versiones publicadas.
// Si cada publicación borrara los archivos anteriores, un teléfono con la página guardada (GitHub Pages
// la guarda hasta 10 minutos, y la app de la pantalla de inicio queda abierta en segundo plano) pediría
// archivos que ya no existen y la app quedaría en blanco.

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

export interface Version {
  fecha: string;
  archivos: string[]; // rutas dentro de la carpeta publicada, ej. «assets/index-abc.js»
}

export const VERSIONES_CONSERVADAS = 5;

// Junta la versión nueva con las anteriores y dice qué archivos de assets/ ya se pueden borrar
export function podar(
  historial: Version[],
  nueva: Version,
  enCarpeta: string[],
  conservar = VERSIONES_CONSERVADAS,
): { versiones: Version[]; borrar: string[] } {
  const versiones = [...historial, nueva].slice(-conservar);
  const vigentes = new Set(versiones.flatMap((v) => v.archivos));
  const borrar = enCarpeta.filter((a) => !vigentes.has(a));
  return { versiones, borrar };
}

export function conservarVersiones(salida: string): Plugin {
  const emitidos = new Set<string>();
  return {
    name: 'conservar-versiones',
    apply: 'build',
    writeBundle(_opciones, bundle) {
      for (const nombre of Object.keys(bundle)) if (nombre.startsWith('assets/')) emitidos.add(nombre);
    },
    closeBundle(error?: Error) {
      if (error || !emitidos.size) return;
      const ruta = join(salida, 'versiones.json');
      const historial: Version[] = existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : [];
      const carpeta = join(salida, 'assets');
      const enCarpeta = readdirSync(carpeta).map((n) => `assets/${n}`);
      const nueva = { fecha: new Date().toISOString(), archivos: [...emitidos].sort() };
      const { versiones, borrar } = podar(historial, nueva, enCarpeta);
      for (const a of borrar) rmSync(join(salida, a));
      writeFileSync(ruta, JSON.stringify(versiones, null, 1) + '\n');
    },
  };
}
