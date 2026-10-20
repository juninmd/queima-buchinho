import { useCallback } from 'react';
import { api, type Written } from '../api/client';
import { ApiError } from '../api/http';
import type { AppToday, MetricType } from '../api/contract';
import { useToast } from './Toast';

type Patch = (fn: (t: AppToday) => AppToday) => void;

export const QUEUED_MSG = 'Sem internet. Salvo e enviado quando voltar.';

/** Escritas do dia: otimistas, com desfazer na água e reconciliação se o servidor recusar. */
export function useActions(patch: Patch, refresh: () => Promise<void>) {
  const toast = useToast();

  const guard = useCallback(async <T,>(call: () => Promise<Written<T>>, msg?: (d: T) => string) => {
    try {
      const r = await call();
      if (r.queued) toast(QUEUED_MSG);
      else if (msg) toast(msg(r.data));
      return r;
    } catch (e) {
      toast(e instanceof ApiError && e.code === 'invalid_value' ? 'Valor fora da faixa.' : 'Não consegui salvar. Tente de novo.');
      await refresh();
      return null;
    }
  }, [toast, refresh]);

  const toggleHabit = useCallback(async (key: string, completed: boolean) => {
    patch(t => ({ ...t, habits: { ...t.habits, [key]: completed },
      trained: key === 'treino' ? completed : t.trained, cardioDone: key === 'cardio' ? completed : t.cardioDone }));
    await guard(() => api.setHabit(key, completed));
  }, [patch, guard]);

  const logMetric = useCallback(async (type: MetricType, value: number) => {
    patch(t => ({
      ...t,
      water: type === 'water' ? { ...t.water, ml: t.water.ml + value } : t.water,
      weight: type === 'weight' ? value : t.weight,
      body: {
        ...t.body, steps: type === 'steps' ? value : t.body.steps, height: type === 'height' ? value : t.body.height,
        bodyFat: type === 'body_fat' ? value : t.body.bodyFat, muscleMass: type === 'muscle_mass' ? value : t.body.muscleMass,
      },
    }));
    const label = type === 'water' ? `+${value} ml registrados` : 'Medida salva';
    const r = await guard(() => api.logMetric(type, value));
    if (!r || r.queued) return;
    const { id } = r.data;
    toast(label, { label: 'Desfazer', run: () => { void api.undoMetric(id).then(refresh); } });
  }, [patch, guard, toast, refresh]);

  const finish = useCallback(async (kind: 'treino' | 'cardio') => {
    patch(t => ({ ...t, habits: { ...t.habits, [kind]: true }, trained: kind === 'treino' ? true : t.trained,
      cardioDone: kind === 'cardio' ? true : t.cardioDone }));
    const r = await guard<unknown>(() => (kind === 'treino' ? api.finishWorkout() : api.finishCardio()),
      () => (kind === 'treino' ? 'Treino registrado.' : 'Cárdio registrado.'));
    if (r && !r.queued) await refresh();
  }, [patch, guard, refresh]);

  const resetWorkout = useCallback(async () => {
    patch(t => ({ ...t, habits: { ...t.habits, treino: false }, trained: false }));
    try { await api.resetWorkout(); toast('Treino de hoje zerado.'); } catch { toast('Não consegui zerar agora.'); }
    await refresh();
  }, [patch, toast, refresh]);

  return { toggleHabit, logMetric, finish, resetWorkout };
}
