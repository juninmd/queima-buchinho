import { normalizePrefs } from '../../src/features/push/push.types';
import { PushService } from '../../src/features/push/push.service';
import { pushClosing, pushFicha, pushMeal, pushWater } from '../../src/features/push/push.hooks';

const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({ query: (...a: unknown[]) => mockQuery(...a) }));
const mockSend = jest.fn();
jest.mock('web-push', () => ({
  __esModule: true,
  default: { setVapidDetails: jest.fn(), sendNotification: (...a: unknown[]) => mockSend(...a) },
}));
jest.mock('../../src/features/push/push.service', () => {
  const actual = jest.requireActual('../../src/features/push/push.service');
  return { ...actual, pushService: { notify: jest.fn().mockResolvedValue(undefined) } };
});

const payload = { title: 't', body: 'b', tag: 'x', url: '/' };
const row = (endpoint: string, prefs: unknown) => ({ endpoint, p256dh: 'p', auth: 'a', prefs });

describe('push', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
  });
  afterAll(() => { delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY; });

  it('normalizePrefs liga tudo por padrão e só aceita booleans', () => {
    expect(normalizePrefs(undefined)).toEqual({ ficha: true, agua: true, refeicao: true, fechamento: true });
    expect(normalizePrefs({ agua: false, ficha: 'não', extra: false })).toEqual({ ficha: true, agua: false, refeicao: true, fechamento: true });
  });

  it('sem VAPID não consulta nem envia', async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    const svc = new PushService();
    expect(svc.isEnabled()).toBe(false);
    expect(svc.publicKey()).toBeNull();
    await svc.notify(1, 'agua', payload);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('notify respeita as prefs de cada inscrição', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row('e1', { agua: false }), row('e2', {}), row('e3', null)] });
    mockSend.mockResolvedValue({});
    const svc = new PushService();
    expect(svc.publicKey()).toBe('pub');
    await svc.notify(1, 'agua', payload);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend.mock.calls.map(c => c[0].endpoint).sort()).toEqual(['e2', 'e3']);
    expect(JSON.parse(mockSend.mock.calls[0][1])).toEqual(payload);
  });

  it('remove inscrição 404/410 e ignora outras falhas sem lançar', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row('gone', {}), row('flaky', {}), row('ok', {})] });
    mockSend.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint === 'gone') throw Object.assign(new Error('gone'), { statusCode: 410 });
      if (sub.endpoint === 'flaky') throw Object.assign(new Error('boom'), { statusCode: 500 });
    });
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(new PushService().notify(1, 'ficha', payload)).resolves.toBeUndefined();
    const deletes = mockQuery.mock.calls.filter(c => String(c[0]).includes('DELETE'));
    expect(deletes).toHaveLength(1);
    expect(deletes[0][1]).toEqual(['gone']);
  });

  it('erro de banco nunca derruba o job', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db'));
    await expect(new PushService().notify(1, 'fechamento', payload)).resolves.toBeUndefined();
  });

  it('subscribe, updatePrefs e unsubscribe falam com o banco', async () => {
    const svc = new PushService();
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    await svc.subscribe(1, { endpoint: 'https://e', keys: { p256dh: 'p', auth: 'a' } }, { agua: false });
    expect(mockQuery.mock.calls[0][1].slice(0, 4)).toEqual([1, 'https://e', 'p', 'a']);
    expect(JSON.parse(mockQuery.mock.calls[0][1][4]).agua).toBe(false);
    expect(await svc.updatePrefs(1, 'https://e', normalizePrefs({}))).toBe(true);
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    expect(await svc.updatePrefs(1, 'nope', normalizePrefs({}))).toBe(false);
    await svc.unsubscribe(1, 'https://e');
    expect(String(mockQuery.mock.calls.at(-1)[0])).toContain('DELETE');
  });

  it('hooks montam o payload de cada lembrete', async () => {
    const { pushService } = jest.requireMock('../../src/features/push/push.service');
    await pushFicha(1, 'Superior');
    await pushWater(1, 800, 2000);
    await pushMeal(1, 'almoco');
    await pushClosing(1, 7, 12, 6);
    const kinds = pushService.notify.mock.calls.map((c: unknown[]) => c[1]);
    expect(kinds).toEqual(['ficha', 'agua', 'refeicao', 'fechamento']);
    expect(pushService.notify.mock.calls[2][2].body).toContain('almoço');
    expect(pushService.notify.mock.calls[3][2].body).toBe('7/12 hábitos. Nota 6/10.');
  });
});
