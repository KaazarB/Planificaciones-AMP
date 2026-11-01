import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), legacy()],
  // En el computador usa la raíz; al publicar, la dirección de GitHub Pages
  base: command === 'build' ? '/Planificaciones-AMP/movil/' : '/',
  build: { outDir: '../movil', emptyOutDir: true },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Playwright e2e specs live in e2e/.
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));