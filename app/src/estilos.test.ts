// Protege los estilos: una llave sin cerrar en un .css deja sin efecto todo lo que viene después
// (incluido el CSS de Ionic) y la app abre en blanco o sin responder en el teléfono.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function archivosCss(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return archivosCss(ruta);
    return n.endsWith('.css') ? [ruta] : [];
  });
}

// Quita comentarios y textos entre comillas (pueden tener llaves que no cuentan)
const limpio = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');

describe('Archivos de estilos', () => {
  for (const ruta of archivosCss(join(__dirname))) {
    it(`${ruta.split('src')[1]}: llaves balanceadas y sin marcas de conflicto`, () => {
      const css = readFileSync(ruta, 'utf8');
      expect(css).not.toMatch(/^(<{7}|={7}|>{7})/m);
      let nivel = 0;
      for (const [n, linea] of limpio(css).split('\n').entries()) {
        for (const c of linea) {
          if (c === '{') nivel++;
          if (c === '}') nivel--;
          if (nivel < 0) throw new Error(`Llave «}» de más en la línea ${n + 1}`);
        }
      }
      expect(nivel, 'llaves «{» sin cerrar').toBe(0);
    });
  }
});
