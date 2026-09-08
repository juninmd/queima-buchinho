import { CATALOG_MAP } from './catalog';
import { PLAN_MAP, WEEKDAY_PLAN } from './plans';
import type { DayPlan, Ficha, FichaExercise, PlanItem } from './types';

/** Dia sem treino previsto (domingo) devolve `null` — quem chama decide o que dizer. */
export function getPlanForDay(dayName: string): DayPlan | null {
  const planKey = WEEKDAY_PLAN[dayName];
  return planKey ? PLAN_MAP.get(planKey) ?? null : null;
}

function resolve(item: PlanItem, loads: Map<string, number>): FichaExercise {
  const entry = CATALOG_MAP.get(item.key);
  if (!entry) throw new Error(`Exercicio "${item.key}" nao existe no catalogo`);
  // Carga salva vence a sugestão do catálogo; `null` no catálogo significa que o
  // exercício não tem carga externa, então nem a carga salva o torna ajustável.
  const cargaKg = entry.cargaPadraoKg === null ? null : loads.get(item.key) ?? entry.cargaPadraoKg;
  return { ...item, nome: entry.nome, aparelho: entry.aparelho, img: entry.img, cargaKg };
}

/**
 * Monta a ficha do dia. Puro: mesma entrada, mesma saída — o LLM só entra depois,
 * para escrever a provocação da Mika, nunca para escolher exercício ou carga.
 */
export function buildFicha(plan: DayPlan, loads: Map<string, number>, data: string): Ficha {
  return {
    planKey: plan.key,
    emoji: plan.emoji,
    titulo: plan.titulo,
    foco: plan.foco,
    metodo: plan.metodo,
    data,
    exercicios: [...plan.itens, plan.cardio].map(item => resolve(item, loads)),
  };
}

/** Índice do bloco de cárdio: sempre o último, por construção de `buildFicha`. */
export function cardioIndex(ficha: Ficha): number {
  return ficha.exercicios.length - 1;
}
