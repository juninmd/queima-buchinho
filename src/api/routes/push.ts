import { deviceRepo } from '../../features/push/device.repo';
import { runPushAction } from '../../features/push/push.actions';
import { pushService } from '../../features/push/push.service';
import { normalizePrefs } from '../../features/push/push.types';
import type { DevicePlatform, PushSubscriptionInput } from '../../features/push/push.types';
import { HttpError } from '../http';
import { asObject, reqString, type Json } from '../validate';
import type { Router } from '../router';

function parseSubscription(raw: unknown): PushSubscriptionInput {
  const sub = asObject(raw);
  const endpoint = reqString(sub, 'endpoint', 2000);
  if (!endpoint.startsWith('https://')) throw new HttpError(400, 'invalid_endpoint');
  const keys = asObject(sub.keys);
  return { endpoint, keys: { p256dh: reqString(keys, 'p256dh', 200), auth: reqString(keys, 'auth', 100) } };
}

function parsePlatform(raw: unknown): DevicePlatform {
  if (raw !== 'android' && raw !== 'ios') throw new HttpError(400, 'invalid_platform');
  return raw;
}

function requireNative(): void {
  if (!pushService.isNativeEnabled()) throw new HttpError(503, 'push_disabled');
}

function requireEnabled(): void {
  if (!pushService.isEnabled()) throw new HttpError(503, 'push_disabled');
}

export function pushRoutes(router: Router): void {
  router
    .add('GET', '/api/push/config', async () => ({ enabled: pushService.isEnabled(), publicKey: pushService.publicKey(), native: pushService.isNativeEnabled() }))
    .add('POST', '/api/push/subscribe', async ({ userId, body }) => {
      requireEnabled();
      const data: Json = asObject(await body());
      await pushService.subscribe(userId, parseSubscription(data.subscription), data.prefs);
      return { ok: true };
    })
    .add('PUT', '/api/push/prefs', async ({ userId, body }) => {
      requireEnabled();
      const data = asObject(await body());
      const found = await pushService.updatePrefs(userId, reqString(data, 'endpoint', 2000), normalizePrefs(asObject(data.prefs)));
      if (!found) throw new HttpError(404, 'not_found');
      return { ok: true };
    })
    .add('DELETE', '/api/push/subscribe', async ({ userId, body }) => {
      await pushService.unsubscribe(userId, reqString(asObject(await body()), 'endpoint', 2000));
      return { ok: true };
    })
    // App nativo (Capacitor): token FCM em vez de endpoint Web Push.
    .add('POST', '/api/push/device', async ({ userId, body }) => {
      requireNative();
      const data = asObject(await body());
      await deviceRepo.save(userId, reqString(data, 'token', 4096), parsePlatform(data.platform), data.prefs);
      return { ok: true };
    })
    .add('PUT', '/api/push/device/prefs', async ({ userId, body }) => {
      const data = asObject(await body());
      const found = await deviceRepo.updatePrefs(userId, reqString(data, 'token', 4096), normalizePrefs(asObject(data.prefs)));
      if (!found) throw new HttpError(404, 'not_found');
      return { ok: true };
    })
    .add('DELETE', '/api/push/device', async ({ userId, body }) => {
      await deviceRepo.remove(userId, reqString(asObject(await body()), 'token', 4096));
      return { ok: true };
    })
    // Botão da notificação (ex.: "+300 ml"): grava no mesmo banco do Telegram.
    .add('POST', '/api/push/action', async ({ userId, body }) => {
      const result = await runPushAction(userId, reqString(asObject(await body()), 'action', 40));
      if (!result) throw new HttpError(400, 'invalid_action');
      return result;
    });
}
