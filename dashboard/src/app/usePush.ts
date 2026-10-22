import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PushConfig, PushPrefs } from '../api/contract';
import { loadPrefs, pushSupported, savePrefs, urlBase64ToUint8Array } from '../lib/push';
import {
  dropNativeToken, isNativeApp, nativePermissionState, nativePlatform, nativeToken, requestNativePermission,
  setupNativeChannels,
} from '../lib/native';

export type PushStatus = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';

const currentSub = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription();
const NATIVE_KEY = 'qb.push.native';
const nativeOn = (): boolean => { try { return localStorage.getItem(NATIVE_KEY) === '1'; } catch { return false; } };
const setNativeOn = (on: boolean): void => { try { localStorage.setItem(NATIVE_KEY, on ? '1' : '0'); } catch { /* sem storage */ } };

/** No app Android/iOS o registro é um token FCM; no navegador/PWA, uma inscrição Web Push. */
export function usePush() {
  const native = isNativeApp();
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [status, setStatus] = useState<PushStatus>(native || pushSupported() ? 'off' : 'unsupported');
  const [prefs, setPrefs] = useState<PushPrefs>(loadPrefs);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!native && !pushSupported()) return;
    void (async () => {
      try {
        const cfg = await api.pushConfig();
        setConfig(cfg);
        if (!(native ? cfg.native : cfg.enabled)) return setStatus('unavailable');
        if (native) {
          if ((await nativePermissionState()) === 'denied') return setStatus('denied');
          return setStatus(nativeOn() ? 'on' : 'off');
        }
        if (Notification.permission === 'denied') return setStatus('denied');
        setStatus((await currentSub()) ? 'on' : 'off');
      } catch { setStatus('unavailable'); }
    })();
  }, [native]);

  const enableNative = useCallback(async () => {
    if (!(await requestNativePermission())) return setStatus('denied');
    await setupNativeChannels();
    await api.pushDevice(await nativeToken(), nativePlatform(), prefs);
    setNativeOn(true);
    setStatus('on');
  }, [prefs]);

  const enableWeb = useCallback(async () => {
    if (!config?.publicKey) return;
    if ((await Notification.requestPermission()) !== 'granted') return setStatus('denied');
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) });
    await api.pushSubscribe(sub.toJSON(), prefs);
    setStatus('on');
  }, [config, prefs]);

  const enable = useCallback(async () => {
    setBusy(true);
    try { await (native ? enableNative() : enableWeb()); } finally { setBusy(false); }
  }, [native, enableNative, enableWeb]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      if (native) {
        await api.pushDeviceRemove(await nativeToken()).catch(() => {});
        await dropNativeToken().catch(() => {});
        setNativeOn(false);
      } else {
        const sub = await currentSub();
        if (sub) { await api.pushUnsubscribe(sub.endpoint).catch(() => {}); await sub.unsubscribe(); }
      }
      setStatus('off');
    } finally { setBusy(false); }
  }, [native]);

  const setPref = useCallback(async (key: keyof PushPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
    if (status !== 'on') return;
    if (native) return void api.pushDevicePrefs(await nativeToken(), next).catch(() => {});
    const sub = await currentSub();
    if (sub) await api.pushPrefs(sub.endpoint, next).catch(() => {});
  }, [prefs, status, native]);

  return { status, prefs, busy, enable, disable, setPref };
}
