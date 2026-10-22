import { startApi } from './helpers';
import { buildMessage, categoryOf, channelOf } from '../../src/features/push/fcm.client';
import { runPushAction } from '../../src/features/push/push.actions';

jest.mock('../../src/features/push/device.repo', () => ({
  deviceRepo: { save: jest.fn(), updatePrefs: jest.fn(), remove: jest.fn(), purge: jest.fn(), list: jest.fn() },
}));
const { deviceRepo: mockRepo } = jest.requireMock('../../src/features/push/device.repo');
const mockLog = jest.fn();
const mockSum = jest.fn();
jest.mock('../../src/services/metrics.service', () => ({
  metricsService: { logMetric: (...a: unknown[]) => mockLog(...a), getTodaySum: (...a: unknown[]) => mockSum(...a) },
}));
const mockMark = jest.fn();
jest.mock('../../src/services/habits.service', () => ({ habitsService: { markHabit: (...a: unknown[]) => mockMark(...a) } }));
jest.mock('../../src/features/push/push.service', () => ({
  pushService: { isEnabled: () => true, isNativeEnabled: () => true, publicKey: () => 'PUB' },
}));

describe('push nativo', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => { api = await startApi(7); });
  afterAll(() => api.close());
  beforeEach(() => { jest.clearAllMocks(); mockSum.mockResolvedValue(900); });

  it('registra, atualiza prefs e remove o token do aparelho', async () => {
    expect((await api.call('POST', '/api/push/device', { token: 't1', platform: 'ios', prefs: { agua: false } })).json).toEqual({ ok: true });
    expect(mockRepo.save).toHaveBeenCalledWith(7, 't1', 'ios', { agua: false });
    expect((await api.call('POST', '/api/push/device', { token: 't1', platform: 'web' })).status).toBe(400);
    mockRepo.updatePrefs.mockResolvedValueOnce(false);
    expect((await api.call('PUT', '/api/push/device/prefs', { token: 'x', prefs: {} })).status).toBe(404);
    await api.call('DELETE', '/api/push/device', { token: 't1' });
    expect(mockRepo.remove).toHaveBeenCalledWith(7, 't1');
  });

  it('botão de água grava no banco e responde o total', async () => {
    const res = await api.call('POST', '/api/push/action', { action: 'water_300' });
    expect(mockLog).toHaveBeenCalledWith(7, 'water', 300, 'ml');
    expect(res.json.message).toContain('+300ml');
  });

  it('ação desconhecida é recusada', async () => {
    expect((await api.call('POST', '/api/push/action', { action: 'water_9999' })).status).toBe(400);
    expect((await api.call('POST', '/api/push/action', { action: 'meal_treino' })).status).toBe(400);
    expect(mockLog).not.toHaveBeenCalled();
    expect(await runPushAction(7, 'nada')).toBeNull();
  });

  it('botão "Já comi" marca o hábito da refeição', async () => {
    await api.call('POST', '/api/push/action', { action: 'meal_almoco' });
    expect(mockMark).toHaveBeenCalledWith(7, 'almoco', true);
  });
});

describe('mensagem FCM', () => {
  it('leva imagem, canal Android, categoria iOS e data em string', () => {
    const m = buildMessage('tok', 'agua', {
      title: 't', body: 'b', tag: 'agua', url: '/#hoje', image: 'https://x/y.png', actions: [{ id: 'water_200', title: '+200 ml' }],
    });
    expect(m.token).toBe('tok');
    expect(m.notification.image).toBe('https://x/y.png');
    expect(m.android.notification.channel_id).toBe(channelOf('agua'));
    expect(m.apns.payload.aps.category).toBe(categoryOf('agua'));
    expect(m.apns.payload.aps['mutable-content']).toBe(1);
    expect(m.apns.fcm_options?.image).toBe('https://x/y.png');
    expect(Object.values(m.data).every(v => typeof v === 'string')).toBe(true);
    expect(JSON.parse(m.data.actions)).toHaveLength(1);
  });

  it('sem imagem não manda campos de imagem', () => {
    const m = buildMessage('tok', 'ficha', { title: 't', body: 'b', tag: 'f', url: '/' });
    expect('image' in m.notification).toBe(false);
    expect('fcm_options' in m.apns).toBe(false);
  });
});
