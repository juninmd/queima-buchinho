import type { PushPrefs } from '../api/contract';
import { readJson, writeJson } from './storage';

const KEY = 'qb.push.prefs';
export const DEFAULT_PREFS: PushPrefs = { ficha: true, agua: true, refeicao: true, fechamento: true };

export const pushSupported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const loadPrefs = (): PushPrefs => ({ ...DEFAULT_PREFS, ...readJson<Partial<PushPrefs>>(KEY, {}) });
export const savePrefs = (p: PushPrefs): void => writeJson(KEY, p);

/** A chave VAPID chega em base64url; o PushManager exige bytes. */
export function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const padded = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
