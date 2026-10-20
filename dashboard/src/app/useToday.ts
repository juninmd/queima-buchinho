import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AppToday } from '../api/contract';
import { readJson, writeJson } from '../lib/storage';

const CACHE_KEY = 'qb.cache.today';
const REFRESH_MS = 60_000;

/** Estado do dia com cache local: abre instantâneo e continua útil sem rede. */
export function useToday(enabled: boolean) {
  const [today, setToday] = useState<AppToday | null>(() => readJson<AppToday | null>(CACHE_KEY, null));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const t = await api.today();
      setToday(t);
      writeJson(CACHE_KEY, t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erro');
    }
  }, []);

  /** Atualização otimista: aplica já, e o refresh seguinte reconcilia com o servidor. */
  const patch = useCallback((fn: (t: AppToday) => AppToday) => {
    setToday(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      writeJson(CACHE_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, refresh]);

  return { today, error, refresh, patch };
}
