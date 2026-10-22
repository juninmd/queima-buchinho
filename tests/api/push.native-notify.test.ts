import { generateKeyPairSync } from 'crypto';

const mockPost = jest.fn();
jest.mock('axios', () => ({ __esModule: true, default: { post: (...a: unknown[]) => mockPost(...a) } }));
jest.mock('web-push', () => ({ __esModule: true, default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() } }));
jest.mock('../../src/config/database', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));
jest.mock('../../src/features/push/device.repo', () => ({
  deviceRepo: { list: jest.fn(), purge: jest.fn().mockResolvedValue(undefined) },
}));

import { FcmClient } from '../../src/features/push/fcm.client';
import { PushService } from '../../src/features/push/push.service';

const { deviceRepo } = jest.requireMock('../../src/features/push/device.repo');
const payload = { title: 't', body: 'b', tag: 'agua', url: '/#hoje' };
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const account = { project_id: 'proj', client_email: 'sa@proj.iam', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };

describe('push nativo (FCM)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    process.env.FCM_SERVICE_ACCOUNT = Buffer.from(JSON.stringify(account)).toString('base64');
  });
  afterAll(() => { delete process.env.FCM_SERVICE_ACCOUNT; });

  it('sem conta de serviço fica desligado e não consulta o banco', async () => {
    delete process.env.FCM_SERVICE_ACCOUNT;
    const svc = new PushService();
    expect(svc.isNativeEnabled()).toBe(false);
    await svc.notify(1, 'agua', payload);
    expect(deviceRepo.list).not.toHaveBeenCalled();
  });

  it('troca o JWT por token de acesso uma vez e envia à API v1 do projeto', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'AT', expires_in: 3600 } }).mockResolvedValue({ data: {} });
    const fcm = new FcmClient();
    expect(await fcm.send('tok', 'agua', payload)).toBe('ok');
    expect(await fcm.send('tok2', 'agua', payload)).toBe('ok');
    expect(mockPost).toHaveBeenCalledTimes(3);
    expect(mockPost.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
    expect(mockPost.mock.calls[1][0]).toBe('https://fcm.googleapis.com/v1/projects/proj/messages:send');
    expect(mockPost.mock.calls[1][2].headers.Authorization).toBe('Bearer AT');
    expect(mockPost.mock.calls[1][1].message.token).toBe('tok');
  });

  it('respeita prefs por aparelho e remove token que o FCM diz estar morto', async () => {
    deviceRepo.list.mockResolvedValue([
      { token: 'on', platform: 'android', prefs: {} },
      { token: 'off', platform: 'ios', prefs: { agua: false } },
      { token: 'dead', platform: 'ios', prefs: null },
    ]);
    mockPost.mockImplementation(async (url: string, body: any) => {
      if (url.includes('oauth2')) return { data: { access_token: 'AT', expires_in: 3600 } };
      if (body.message.token === 'dead') throw { response: { status: 404, data: { error: { status: 'UNREGISTERED' } } } };
      return { data: {} };
    });
    await new PushService().notify(1, 'agua', payload);
    const sent = mockPost.mock.calls.filter(c => String(c[0]).includes('messages:send')).map(c => c[1].message.token).sort();
    expect(sent).toEqual(['dead', 'on']);
    expect(deviceRepo.purge).toHaveBeenCalledWith('dead');
  });

  it('falha de rede no FCM não derruba o job', async () => {
    deviceRepo.list.mockResolvedValue([{ token: 'a', platform: 'android', prefs: {} }]);
    mockPost.mockRejectedValue(new Error('boom'));
    await expect(new PushService().notify(1, 'agua', payload)).resolves.toBeUndefined();
    expect(deviceRepo.purge).not.toHaveBeenCalled();
  });
});
