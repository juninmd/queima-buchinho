import fs from 'fs';
import http from 'http';
import path from 'path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json',
};

export const getPwaDistDir = (): string =>
  path.resolve(process.env.PWA_DIST_DIR || path.join(process.cwd(), 'dashboard', 'dist'));

const isFile = (p: string): Promise<boolean> =>
  fs.promises.stat(p).then(s => s.isFile(), () => false);

/** Arquivos com hash em /assets nunca mudam; o resto precisa revalidar (sw.js, manifest, index). */
const cacheControl = (rel: string): string =>
  rel.startsWith(`assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache';

function sendFile(req: http.IncomingMessage, res: http.ServerResponse, file: string, rel: string): void {
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': cacheControl(rel),
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') return void res.end();
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

/**
 * Serve o PWA buildado (sem auth: só o app shell; os dados ficam atrás do token em /api).
 * Devolve `false` quando não cuida do pedido (sem build, método ou pasta fora do dist).
 */
export async function servePwa(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const root = getPwaDistDir();
  const index = path.join(root, 'index.html');
  if (!(await isFile(index))) return false;

  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    return false;
  }
  if (pathname.includes('\0')) return false;

  const file = path.normalize(path.join(root, pathname));
  if (file !== root && !file.startsWith(root + path.sep)) return false;

  if (await isFile(file)) {
    sendFile(req, res, file, path.relative(root, file));
    return true;
  }
  // Asset inexistente é 404 de verdade; rota do app (sem extensão) cai no index.html do SPA.
  if (path.extname(pathname)) return false;
  sendFile(req, res, index, 'index.html');
  return true;
}
