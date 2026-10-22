import { startApi } from './helpers';

jest.mock('../../src/features/pause/pause.service', () => ({
  MAX_PAUSE_DAYS: 30,
  pauseService: {
    activeUntil: jest.fn().mockResolvedValue(null),
    pause: jest.fn().mockResolvedValue('2026-10-22'),
    resume: jest.fn().mockResolvedValue(true),
  },
}));
jest.mock('../../src/features/push/push.service', () => ({
  pushService: {
    isEnabled: jest.fn(() => true),
    isNativeEnabled: jest.fn(() => true),
    publicKey: jest.fn(() => 'PUB'),
    subscribe: jest.fn().mockResolvedValue(undefined),
    updatePrefs: jest.fn().mockResolvedValue(true),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
  },
}));

const { pauseService } = jest.requireMock('../../src/features/pause/pause.service');
const { pushService } = jest.requireMock('../../src/features/push/push.service');
const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };

describe('pausa e push', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => { api = await startApi(7); });
  afterAll(() => api.close());
  beforeEach(() => jest.clearAllMocks());

  it('pausa: consulta, cria e retoma', async () => {
    expect((await api.call('GET', '/api/pause')).json).toEqual({ until: null });
    expect((await api.call('POST', '/api/pause', { days: 3 })).json).toEqual({ until: '2026-10-22' });
    expect(pauseService.pause).toHaveBeenCalledWith(7, 3);
    expect((await api.call('DELETE', '/api/pause')).json).toEqual({ resumed: true });
  });

  it('pausa valida de 1 a 30 dias inteiros', async () => {
    for (const days of [0, 31, 1.5, '3']) {
      expect((await api.call('POST', '/api/pause', { days })).status).toBe(400);
    }
    expect(pauseService.pause).not.toHaveBeenCalled();
  });

  it('push/config expõe a chave pública', async () => {
    expect((await api.call('GET', '/api/push/config')).json).toEqual({ enabled: true, publicKey: 'PUB', native: true });
  });

  it('inscreve com prefs e valida a inscrição', async () => {
    const prefs = { ficha: false };
    expect((await api.call('POST', '/api/push/subscribe', { subscription: sub, prefs })).json).toEqual({ ok: true });
    expect(pushService.subscribe).toHaveBeenCalledWith(7, sub, prefs);
    const http = await api.call('POST', '/api/push/subscribe', { subscription: { ...sub, endpoint: 'http://x' } });
    expect(http.json).toEqual({ error: 'invalid_endpoint' });
    expect((await api.call('POST', '/api/push/subscribe', { subscription: { endpoint: sub.endpoint } })).status).toBe(400);
    expect((await api.call('POST', '/api/push/subscribe', {})).status).toBe(400);
  });

  it('push desligado no servidor responde 503', async () => {
    pushService.isEnabled.mockReturnValueOnce(false);
    expect((await api.call('POST', '/api/push/subscribe', { subscription: sub })).json).toEqual({ error: 'push_disabled' });
  });

  it('atualiza prefs (404 se a inscrição não existe) e cancela', async () => {
    const prefs = { ficha: true, agua: false, refeicao: true, fechamento: true };
    expect((await api.call('PUT', '/api/push/prefs', { endpoint: sub.endpoint, prefs })).json).toEqual({ ok: true });
    expect(pushService.updatePrefs).toHaveBeenCalledWith(7, sub.endpoint, prefs);
    pushService.updatePrefs.mockResolvedValueOnce(false);
    expect((await api.call('PUT', '/api/push/prefs', { endpoint: sub.endpoint, prefs })).status).toBe(404);
    expect((await api.call('DELETE', '/api/push/subscribe', { endpoint: sub.endpoint })).json).toEqual({ ok: true });
    expect(pushService.unsubscribe).toHaveBeenCalledWith(7, sub.endpoint);
  });
});
