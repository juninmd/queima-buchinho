import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // O SDK web do Firebase (peer do plugin) nunca roda: o plugin só é usado no app nativo.
  build: { rollupOptions: { external: [/^firebase\//] } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
