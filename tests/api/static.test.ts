import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { startApi } from './helpers';

/** `fetch` normaliza `..`; para provar o bloqueio mandamos o caminho cru. */
function raw(base: string, rawPath: string): Promise<{ status: number; body: string }> {
  const { port } = new URL(base);
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: rawPath }, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    }).on('error', reject);
  });
}

describe('PWA estático', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-'));
  const dist = path.join(tmp, 'dist');
  let api: Awaited<ReturnType<typeof startApi>>;

  beforeAll(async () => {
    fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'index.html'), '<html>app</html>');
    fs.writeFileSync(path.join(dist, 'sw.js'), 'self.x=1');
    fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), '{}');
    fs.writeFileSync(path.join(dist, 'assets', 'app-abc.js'), 'console.log(1)');
    fs.writeFileSync(path.join(tmp, 'secret.txt'), 'segredo');
    process.env.PWA_DIST_DIR = dist;
    api = await startApi();
  });
  afterAll(async () => { delete process.env.PWA_DIST_DIR; fs.rmSync(tmp, { recursive: true, force: true }); await api.close(); });

  it('serve index e rotas do SPA sem token', async () => {
    const root = await fetch(`${api.base}/`);
    expect(root.status).toBe(200);
    expect(root.headers.get('content-type')).toContain('text/html');
    expect(root.headers.get('cache-control')).toBe('no-cache');
    expect(await (await fetch(`${api.base}/treino`)).text()).toContain('app');
  });

  it('usa o tipo certo e cache imutável só em /assets', async () => {
    const js = await fetch(`${api.base}/assets/app-abc.js`);
    expect(js.headers.get('content-type')).toContain('text/javascript');
    expect(js.headers.get('cache-control')).toContain('immutable');
    expect((await fetch(`${api.base}/sw.js`)).headers.get('cache-control')).toBe('no-cache');
    expect((await fetch(`${api.base}/manifest.webmanifest`)).headers.get('content-type')).toBe('application/manifest+json');
  });

  it('asset inexistente é 404 e HEAD funciona', async () => {
    expect((await fetch(`${api.base}/assets/nao-existe.js`)).status).toBe(404);
    expect((await fetch(`${api.base}/`, { method: 'HEAD' })).status).toBe(200);
  });

  it('bloqueia path traversal', async () => {
    for (const p of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/%2e%2e%2fsecret.txt', '/%00']) {
      const res = await raw(api.base, p);
      expect(res.body).not.toContain('segredo');
    }
    expect((await raw(api.base, '/%E0%A4%A')).status).toBe(404);
  });

  it('/api continua exigindo token mesmo com o PWA ativo', async () => {
    expect((await fetch(`${api.base}/api/app/today`)).status).toBe(401);
  });

  it('sem build, a raiz responde 404', async () => {
    process.env.PWA_DIST_DIR = path.join(tmp, 'vazio');
    expect((await fetch(`${api.base}/`)).status).toBe(404);
    process.env.PWA_DIST_DIR = dist;
  });
});
