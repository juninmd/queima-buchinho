import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PushConfig, PushPrefs } from '../api/contract';
import { loadPrefs, pushSupported, savePrefs, urlBase64ToUint8Array } from '../lib/push';

export type PushStatus = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';

const currentSub = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription();

export function usePush() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [status, setStatus] = useState<PushStatus>(pushSupported() ? 'off' : 'unsupported');
  const [prefs, setPrefs] = useState<PushPrefs>(loadPrefs);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    void (async () => {
      try {
        const cfg = await api.pushConfig();
        setConfig(cfg);
        if (!cfg.enabled) return setStatus('unavailable');
        if (Notification.permission === 'denied') return setStatus('denied');
        setStatus((await currentSub()) ? 'on' : 'off');
      } catch { setStatus('unavailable'); }
    })();
  }, []);

  const enable = useCallback(async () => {
    if (!config?.publicKey) return;
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== 'granted') return setStatus('denied');
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) });
      await api.pushSubscribe(sub.toJSON(), prefs);
      setStatus('on');
    } finally { setBusy(false); }
  }, [config, prefs]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const sub = await currentSub();
      if (sub) { await api.pushUnsubscribe(sub.endpoint).catch(() => {}); await sub.unsubscribe(); }
      setStatus('off');
    } finally { setBusy(false); }
  }, []);

  const setPref = useCallback(async (key: keyof PushPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
    const sub = status === 'on' ? await currentSub() : null;
    if (sub) await api.pushPrefs(sub.endpoint, next).catch(() => {});
  }, [prefs, status]);

  return { status, prefs, busy, enable, disable, setPref };
}
