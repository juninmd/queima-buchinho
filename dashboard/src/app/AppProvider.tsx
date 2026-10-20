import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { flushQueue } from '../api/client';
import { onPendingChange, pendingCount } from '../lib/queue';
import { useToday } from './useToday';
import { useActions } from './useActions';
import { useFicha } from './useFicha';
import type { Tab } from './tabs';

type Today = ReturnType<typeof useToday>;
type Actions = ReturnType<typeof useActions>;
type FichaApi = ReturnType<typeof useFicha>;

export interface AppContextValue extends Actions, FichaApi {
  today: Today['today'];
  error: string | null;
  online: boolean;
  pending: number;
  refresh: () => Promise<void>;
  tab: Tab;
  go: (tab: Tab, mikaDraft?: string) => void;
  mikaDraft: string | null;
  clearDraft: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp fora do AppProvider');
  return ctx;
};

interface Props { tab: Tab; go: (tab: Tab) => void; children: ReactNode }

export function AppProvider({ tab, go, children }: Props) {
  const { today, error, refresh, patch } = useToday(true);
  const actions = useActions(patch, refresh);
  const fichaApi = useFicha(true, today?.date);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(pendingCount());
  const [mikaDraft, setMikaDraft] = useState<string | null>(null);

  const sync = useCallback(async () => {
    if ((await flushQueue()) > 0) { await refresh(); await fichaApi.refreshFicha(); }
  }, [refresh, fichaApi.refreshFicha]);

  useEffect(() => onPendingChange(setPending), []);
  useEffect(() => {
    const up = () => { setOnline(true); void sync(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    void sync();
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [sync]);

  const value = useMemo<AppContextValue>(() => ({
    ...actions, ...fichaApi, today, error, online, pending, refresh, tab, mikaDraft,
    go: (t, draft) => { if (draft !== undefined) setMikaDraft(draft); go(t); },
    clearDraft: () => setMikaDraft(null),
  }), [actions, fichaApi, today, error, online, pending, refresh, tab, mikaDraft, go]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
