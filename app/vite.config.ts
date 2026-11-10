import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { conservarVersiones } from './conservar-versiones';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), legacy(), conservarVersiones('../movil')],
  // En el computador usa la raíz; al publicar, la dirección de GitHub Pages
  base: command === 'build' ? '/Planificaciones-AMP/movil/' : '/',
  // No se vacía la carpeta: se conservan los archivos de las últimas versiones (ver conservar-versiones.ts)
  build: { outDir: '../movil', emptyOutDir: false },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Playwright e2e specs live in e2e/.
    include: ['src/**/*.test.{ts,tsx}', 'conservar-versiones.test.ts'],
  },
}));
