import { startApi } from './helpers';

jest.mock('../../src/services/metrics.service', () => ({
  metricsService: {
    logMetric: jest.fn().mockResolvedValue(11),
    getTodaySum: jest.fn().mockResolvedValue(1700),
    deleteMetric: jest.fn().mockResolvedValue(true),
  },
}));
const store = new Map<string, string>();
jest.mock('../../src/services/redis.service', () => ({
  redisService: {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
  },
}));

const { metricsService } = jest.requireMock('../../src/services/metrics.service');

describe('métricas e registro rápido', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => { api = await startApi(7); });
  afterAll(() => api.close());
  beforeEach(() => { jest.clearAllMocks(); store.clear(); });

  it('registra água e devolve o total do dia', async () => {
    const res = await api.call('POST', '/api/metrics', { type: 'water', value: 500 });
    expect(res.json).toEqual({ id: 11, total: 1700 });
    expect(metricsService.logMetric).toHaveBeenCalledWith(7, 'water', 500, 'ml');
  });

  it('registra peso sem total', async () => {
    expect((await api.call('POST', '/api/metrics', { type: 'weight', value: 82.5 })).json).toEqual({ id: 11 });
  });

  it('valida tipo, valor e faixa', async () => {
    expect((await api.call('POST', '/api/metrics', { type: 'sleep', value: 8 })).json).toEqual({ error: 'invalid_type' });
    expect((await api.call('POST', '/api/metrics', { type: 'water', value: '500' })).json).toEqual({ error: 'invalid_value' });
    expect((await api.call('POST', '/api/metrics', { type: 'water', value: 9000 })).json).toEqual({ error: 'invalid_value' });
    expect((await api.call('POST', '/api/metrics', { type: 'weight', value: 5 })).status).toBe(400);
    expect((await api.call('POST', '/api/metrics', { type: 'steps', value: 100.5 })).status).toBe(400);
    expect(metricsService.logMetric).not.toHaveBeenCalled();
  });

  it('falha ao gravar vira 500', async () => {
    metricsService.logMetric.mockResolvedValueOnce(null);
    expect((await api.call('POST', '/api/metrics', { type: 'water', value: 200 })).status).toBe(500);
  });

  it('Idempotency-Key evita gravar duas vezes', async () => {
    const headers = { 'Idempotency-Key': 'abc-123' };
    const a = await api.call('POST', '/api/metrics', { type: 'water', value: 300 }, headers);
    const b = await api.call('POST', '/api/metrics', { type: 'water', value: 300 }, headers);
    expect(b.json).toEqual(a.json);
    expect(metricsService.logMetric).toHaveBeenCalledTimes(1);
    await api.call('POST', '/api/metrics', { type: 'water', value: 300 }, { 'Idempotency-Key': 'outra' });
    expect(metricsService.logMetric).toHaveBeenCalledTimes(2);
  });

  it('DELETE desfaz e valida o id', async () => {
    expect((await api.call('DELETE', '/api/metrics/11')).json).toEqual({ deleted: true });
    expect(metricsService.deleteMetric).toHaveBeenCalledWith(7, 11);
    expect((await api.call('DELETE', '/api/metrics/abc')).json).toEqual({ error: 'invalid_id' });
  });

  it('quick-log grava água e peso e pede confirmação para treino', async () => {
    const water = await api.call('POST', '/api/quick-log', { text: 'bebi 500ml' });
    expect(water.json).toMatchObject({ kind: 'water', id: 11 });
    expect(water.json.message).toContain('+500ml');
    const weight = await api.call('POST', '/api/quick-log', { text: 'pesei 82,5' });
    expect(weight.json).toMatchObject({ kind: 'weight', id: 11 });
    expect(weight.json.message).toContain('82,5');
    expect((await api.call('POST', '/api/quick-log', { text: 'treinei' })).json).toEqual({ kind: 'workout', needsConfirm: true });
    expect((await api.call('POST', '/api/quick-log', { text: 'fiz cardio' })).json).toEqual({ kind: 'cardio', needsConfirm: true });
    expect((await api.call('POST', '/api/quick-log', { text: 'não treinei' })).json).toEqual({ kind: 'none' });
    expect((await api.call('POST', '/api/quick-log', { text: '' })).status).toBe(400);
  });
});
