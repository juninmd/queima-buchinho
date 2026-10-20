import { startApi, TOKEN } from './helpers';

jest.mock('../../src/services/dashboard.service', () => ({
  dashboardService: {
    getDailyProgress: jest.fn().mockResolvedValue({ streak: 3 }),
    getRangeProgress: jest.fn().mockResolvedValue({ days: [] }),
  },
}));
jest.mock('../../src/services/dashboard-analysis.service', () => ({
  dashboardAnalysisService: { getAnalysis: jest.fn().mockResolvedValue({ message: 'ok', fallback: false }) },
}));

describe('DashboardApiServer', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => { api = await startApi(); });
  afterAll(() => api.close());

  it('exige token em /api/*', async () => {
    const none = await fetch(`${api.base}/api/dashboard/daily`);
    expect(none.status).toBe(401);
    const wrong = await fetch(`${api.base}/api/dashboard/daily`, { headers: { Authorization: 'Bearer x' } });
    expect(wrong.status).toBe(401);
  });

  it('responde preflight CORS com os métodos novos', async () => {
    const res = await fetch(`${api.base}/api/habits/treino`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-methods')).toContain('PUT');
    expect(res.headers.get('access-control-allow-headers')).toContain('Idempotency-Key');
  });

  it('mantém as rotas de dashboard existentes', async () => {
    expect((await api.call('GET', '/api/dashboard/daily')).json).toEqual({ streak: 3 });
    expect((await api.call('GET', '/api/dashboard/weekly')).json).toEqual({ days: [] });
    expect((await api.call('GET', '/api/dashboard/monthly')).status).toBe(200);
    expect((await api.call('GET', '/api/dashboard/analysis?range=weekly&refresh=1')).json.message).toBe('ok');
    const bad = await api.call('GET', '/api/dashboard/analysis?range=yearly');
    expect(bad.status).toBe(400);
    expect(bad.json).toEqual({ error: 'invalid_range' });
  });

  it('devolve 404 e 405 para rota/método desconhecidos', async () => {
    expect((await api.call('GET', '/api/nada')).json).toEqual({ error: 'not_found' });
    const wrongMethod = await api.call('POST', '/api/dashboard/daily', {});
    expect(wrongMethod.status).toBe(405);
  });

  it('rejeita JSON inválido e corpo grande demais', async () => {
    expect((await api.call('PUT', '/api/habits/treino', '{oops')).json).toEqual({ error: 'invalid_json' });
    const big = await api.call('POST', '/api/mika/chat', { message: 'x'.repeat(40 * 1024) });
    expect(big.status).toBe(413);
    expect(big.json).toEqual({ error: 'payload_too_large' });
  });

  it('sem DASHBOARD_TOKEN nada passa', async () => {
    delete process.env.DASHBOARD_TOKEN;
    const res = await fetch(`${api.base}/api/dashboard/daily`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    expect(res.status).toBe(401);
    process.env.DASHBOARD_TOKEN = TOKEN;
  });

  it('devolve 500 genérico quando a rota quebra', async () => {
    const { dashboardService } = jest.requireMock('../../src/services/dashboard.service');
    dashboardService.getDailyProgress.mockRejectedValueOnce(new Error('boom'));
    const res = await api.call('GET', '/api/dashboard/daily');
    expect(res.status).toBe(500);
    expect(res.json).toEqual({ error: 'internal_error' });
  });
});
