import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Diet, FichaState } from '../api/contract';
import { readJson, writeJson } from '../lib/storage';
import { useToast } from './Toast';
import { QUEUED_MSG } from './useActions';

const FICHA_KEY = 'qb.cache.ficha';
const DIET_KEY = 'qb.cache.diet';
const setsKey = (date: string) => `qb.sets.${date}`;
export type SetsDone = Record<string, number>;

/** Ficha, cardápio e séries marcadas (séries ficam só no aparelho, por dia). */
export function useFicha(enabled: boolean, date: string | undefined) {
  const toast = useToast();
  const [state, setState] = useState<FichaState | null>(() => readJson<FichaState | null>(FICHA_KEY, null));
  const [diet, setDiet] = useState<Diet | null>(() => readJson<Diet | null>(DIET_KEY, null));
  const [sets, setSets] = useState<SetsDone>({});

  const refresh = useCallback(async () => {
    const [f, d] = await Promise.allSettled([api.ficha(), api.diet()]);
    if (f.status === 'fulfilled') { setState(f.value); writeJson(FICHA_KEY, f.value); }
    if (d.status === 'fulfilled') { setDiet(d.value); writeJson(DIET_KEY, d.value); }
  }, []);

  useEffect(() => { if (enabled) void refresh(); }, [enabled, refresh, date]);
  useEffect(() => { if (date) setSets(readJson<SetsDone>(setsKey(date), {})); }, [date]);

  const toggleSet = useCallback((key: string, index: number) => {
    setSets(prev => {
      const next = { ...prev, [key]: prev[key] === index + 1 ? index : index + 1 };
      if (date) writeJson(setsKey(date), next);
      return next;
    });
  }, [date]);

  const adjustLoad = useCallback(async (key: string, delta: number) => {
    setState(s => s?.ficha ? { ...s, ficha: { ...s.ficha, exercicios: s.ficha.exercicios.map(e =>
      e.key === key && e.cargaKg !== null ? { ...e, cargaKg: Math.max(0, e.cargaKg + delta) } : e) } } : s);
    try {
      const r = await api.adjustLoad(key, delta);
      if (r.queued) toast(QUEUED_MSG);
      else toast(`Carga salva: ${r.data.loadKg} kg. Volta no próximo treino.`);
    } catch { toast('Não consegui salvar a carga.'); await refresh(); }
  }, [toast, refresh]);


  return { ficha: state, diet, sets, toggleSet, adjustLoad, refreshFicha: refresh };
}
