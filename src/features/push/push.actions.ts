import { habitsService } from '../../services/habits.service';
import { metricsService } from '../../services/metrics.service';
import { HABIT_MAP } from '../../config/habits';
import { METRIC_LIMITS } from '../../config/constants';
import type { PushAction } from './push.types';

/** Botões das notificações nativas. O servidor é a fonte da verdade: o app só manda o `id`. */
export const WATER_ACTIONS: PushAction[] = [
  { id: 'water_200', title: '+200 ml' },
  { id: 'water_300', title: '+300 ml' },
];
export const mealActions = (): PushAction[] => [{ id: 'meal_done', title: 'Já comi ✅' }];

const MEALS = ['cafe', 'almoco', 'cafe_tarde', 'jantar'];

export interface ActionResult { ok: boolean; message: string }

/** Executa a ação e devolve o texto que o app mostra (mesmos registros do Telegram e do app). */
export async function runPushAction(userId: number, action: string): Promise<ActionResult | null> {
  const water = /^water_(200|300|500)$/.exec(action);
  if (water) {
    const ml = Number(water[1]);
    const limits = METRIC_LIMITS.water;
    if (ml < limits.min || ml > limits.max) return null;
    await metricsService.logMetric(userId, 'water', ml, limits.unit);
    const total = await metricsService.getTodaySum(userId, 'water');
    return { ok: true, message: `💧 +${ml}ml registrado. Total hoje: ${total.toLocaleString('pt-BR')}ml` };
  }
  const meal = /^meal_(\w+)$/.exec(action);
  if (meal && MEALS.includes(meal[1])) {
    await habitsService.markHabit(userId, meal[1], true);
    return { ok: true, message: `${HABIT_MAP.get(meal[1])?.emoji} ${HABIT_MAP.get(meal[1])?.label} marcado.` };
  }
  return null;
}
