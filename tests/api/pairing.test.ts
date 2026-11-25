import { startApi, TOKEN } from './helpers';
import { pairingLink } from '../../src/api/pairing.store';

jest.mock('../../src/services/dashboard.service', () => ({
  dashboardService: { getDailyProgress: jest.fn().mockResolvedValue({ streak: 3 }) },
}));

// Banco falso em memória: só os comandos SQL usados pelo pairing.store.
const codes = new Map<string, { exp: number; used: boolean }>();
const devices: { id: number; name: string; hash: string; exp: number; revoked: boolean; last: Date | null }[] = [];
let clock = Date.now();
jest.mock('../../src/config/database', () => ({
  query: jest.fn(async (sql: string, p: any[] = []) => {
    if (sql.includes('INSERT INTO pairing_codes')) { const exp = clock + p[1] * 60_000; codes.set(p[0], { exp, used: false }); return { rows: [{ expires_at: new Date(exp) }], rowCount: 1 }; }
    if (sql.includes('DELETE FROM pairing_codes')) return { rows: [], rowCount: 0 };
    if (sql.includes('UPDATE pairing_codes')) { const c = codes.get(p[0]); if (!c || c.used || c.exp <= clock) return { rows: [], rowCount: 0 }; c.used = true; return { rows: [{}], rowCount: 1 }; }
    if (sql.includes('INSERT INTO paired_devices')) { const d = { id: devices.length + 1, name: p[0], hash: p[1], exp: clock + p[2] * 86_400_000, revoked: false, last: null }; devices.push(d); return { rows: [{ id: d.id, expires_at: new Date(d.exp) }], rowCount: 1 }; }
    if (sql.includes('SELECT id, last_used_at')) { const d = devices.find((x) => x.hash === p[0] && !x.revoked && x.exp > clock); return { rows: d ? [{ id: d.id, last_used_at: d.last }] : [], rowCount: d ? 1 : 0 }; }
    if (sql.includes('UPDATE paired_devices SET last_used_at')) return { rows: [], rowCount: 1 };
    if (sql.includes('SET revoked_at = NOW() WHERE token_hash')) { const d = devices.find((x) => x.hash === p[0] && !x.revoked); if (d) d.revoked = true; return { rows: [], rowCount: d ? 1 : 0 }; }
    if (sql.includes('SET revoked_at = NOW() WHERE id')) { const d = devices.find((x) => x.id === p[0] && !x.revoked); if (d) d.revoked = true; return { rows: [], rowCount: d ? 1 : 0 }; }
    throw new Error(`SQL inesperado: ${sql}`);
  }),
}));

import { createPairingCode, revokeDevice } from '../../src/api/pairing.store';

describe('pareamento por QR', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => { api = await startApi(); });
  afterAll(() => api.close());

  const post = (path: string, body?: unknown, auth?: string) => fetch(`${api.base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body ?? {}) });
  const daily = (t: string) => fetch(`${api.base}/api/dashboard/daily`, { headers: { Authorization: `Bearer ${t}` } });

  it('link do QR carrega URL e código', () => {
    const l = pairingLink('https://api.exemplo.com/', 'qbp_x');
    const u = new URL(l.replace('queima://', 'http://'));
    expect(u.searchParams.get('u')).toBe('https://api.exemplo.com');
    expect(u.searchParams.get('c')).toBe('qbp_x');
  });

  it('código troca por token, é de uso único e o token acessa a API até ser revogado', async () => {
    const { code } = await createPairingCode();
    const r = await post('/auth/pair', { code, name: 'Pixel' });
    expect(r.status).toBe(200);
    const { token, deviceId } = await r.json() as { token: string; deviceId: number };
    expect(token).toMatch(/^qbd_/);
    expect((await post('/auth/pair', { code })).status).toBe(401); // reuso
    expect((await daily(token)).status).toBe(200);
    expect(await revokeDevice(deviceId)).toBe(true);
    expect((await daily(token)).status).toBe(401);
  });

  it('código expirado, forjado ou malformado é recusado', async () => {
    const { code } = await createPairingCode();
    clock += 6 * 60_000; // passou de 5 min
    const real = Date.now; // o fake do banco usa `clock`
    expect((await post('/auth/pair', { code })).status).toBe(401);
    clock = real();
    expect((await post('/auth/pair', { code: 'qbp_forjado' })).status).toBe(401);
    expect((await post('/auth/pair', { code: 'x' })).status).toBe(400);
    expect((await post('/auth/pair', {})).status).toBe(400);
  });

  it('token de dispositivo não vale como admin do pareamento e /auth/unpair revoga o próprio token', async () => {
    const { code } = await createPairingCode();
    const { token } = await (await post('/auth/pair', { code })).json() as { token: string };
    expect((await post('/auth/unpair', {}, TOKEN)).status).toBe(401); // token interno não é de dispositivo
    expect((await post('/auth/unpair', {}, token)).status).toBe(200);
    expect((await daily(token)).status).toBe(401);
  });

  it('só aceita POST em /auth/pair', async () => {
    expect((await fetch(`${api.base}/auth/pair`)).status).toBe(405);
  });
});
