import { signSession, verifySession } from '../../src/api/auth';
import { startApi, TOKEN } from './helpers';

jest.mock('../../src/services/dashboard.service', () => ({
  dashboardService: { getDailyProgress: jest.fn().mockResolvedValue({ streak: 3 }) },
}));

const realFetch = global.fetch;
let ghUser = 'juninmd';
let ghToken: { access_token?: string; error?: string } = { access_token: 'gho_x' };

describe('login GitHub + token interno', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => {
    process.env.GITHUB_CLIENT_ID = 'cid';
    process.env.SESSION_SECRET = 'segredo-de-teste';
    api = await startApi();
    jest.spyOn(global, 'fetch').mockImplementation(((url: any, init?: any) => {
      const u = String(url);
      if (u.startsWith('http://127.0.0.1')) return realFetch(url, init);
      const json = (b: unknown) => Promise.resolve(new Response(JSON.stringify(b), { status: 200 }));
      if (u.endsWith('/login/device/code')) return json({ device_code: 'dc', user_code: 'ABCD-1234', verification_uri: 'https://github.com/login/device', expires_in: 900, interval: 5 });
      if (u.endsWith('/login/oauth/access_token')) return json(ghToken);
      if (u === 'https://api.github.com/user') return json({ login: ghUser });
      throw new Error(`fetch inesperado: ${u}`);
    }) as any);
  });
  afterAll(async () => { jest.restoreAllMocks(); await api.close(); delete process.env.GITHUB_CLIENT_ID; delete process.env.SESSION_SECRET; });

  const post = (path: string, body?: unknown) => fetch(`${api.base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  const bearer = (t: string) => ({ headers: { Authorization: `Bearer ${t}` } });

  it('endpoints /api exigem credencial', async () => {
    expect((await fetch(`${api.base}/api/dashboard/daily`)).status).toBe(401);
    expect((await fetch(`${api.base}/api/dashboard/daily`, bearer('qb1.x.y'))).status).toBe(401);
  });

  it('token interno (cron/automação) segue funcionando sem GitHub', async () => {
    expect((await fetch(`${api.base}/api/dashboard/daily`, bearer(TOKEN))).status).toBe(200);
  });

  it('device flow: inicia, aguarda e emite sessão para o usuário permitido', async () => {
    const d = await (await post('/auth/github/device')).json();
    expect(d).toMatchObject({ deviceCode: 'dc', userCode: 'ABCD-1234' });

    ghToken = { error: 'authorization_pending' };
    expect(await (await post('/auth/github/poll', { deviceCode: 'dc' })).json()).toEqual({ status: 'pending' });

    ghToken = { access_token: 'gho_x' };
    const ok = await (await post('/auth/github/poll', { deviceCode: 'dc' })).json();
    expect(ok.status).toBe('ok');
    expect((await fetch(`${api.base}/api/dashboard/daily`, bearer(ok.token))).status).toBe(200);
  });

  it('recusa outro usuário do GitHub', async () => {
    ghUser = 'intruso';
    const res = await post('/auth/github/poll', { deviceCode: 'dc' });
    expect(res.status).toBe(403);
    ghUser = 'juninmd';
  });

  it('sessão expirada ou adulterada é recusada', () => {
    expect(verifySession(signSession('juninmd'))).toBe(true);
    expect(verifySession(signSession('juninmd', Date.now() - 31 * 24 * 3600 * 1000))).toBe(false);
    expect(verifySession(signSession('outro'))).toBe(false);
    const t = signSession('juninmd');
    expect(verifySession(t.slice(0, -2) + 'xx')).toBe(false);
  });

  it('/auth/config é público e /health-like não vaza nada', async () => {
    expect(await (await fetch(`${api.base}/auth/config`)).json()).toEqual({ github: true, allowedUser: 'juninmd' });
  });
});
