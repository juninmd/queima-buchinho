import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Serve docs/sonido-migration/preview.html (fora do root do Vite) só no dev, com o HTML transformado. */
function repoDocsPreview(): Plugin {
  return {
    name: 'repo-docs-preview',
    apply: 'serve',
    configureServer(server) {
      const file = new URL('../docs/sonido-migration/preview.html', import.meta.url);
      server.middlewares.use('/sonido-migration/preview.html', (_req, res, next) => {
        server.transformIndexHtml('/sonido-migration/preview.html', readFileSync(file, 'utf8'))
          .then(html => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); })
          .catch(next);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), repoDocsPreview()],
  server: { port: 5173 },
  // O SDK web do Firebase (peer do plugin) nunca roda: o plugin só é usado no app nativo.
  build: { rollupOptions: { external: [/^firebase\//] } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
